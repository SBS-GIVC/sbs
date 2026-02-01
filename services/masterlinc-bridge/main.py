"""
MasterLinc Bridge Service
Central coordinator for BrainSAIT Linc agents

This service:
- Registers and manages Linc agents
- Routes workflow events to appropriate agents
- Maintains workflow state machine
- Provides event streaming via Redis
"""

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import os
import sys
import uvicorn
from datetime import datetime
import uuid
import logging

# Add parent directory to path for shared imports
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))
from shared.middleware.brainsait_oid import BrainSAITOIDMiddleware, get_service_oid

from agents import AgentRegistry, AgentInfo
from workflows import WorkflowOrchestrator, WorkflowEvent
from events import RedisEventBus

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="MasterLinc Bridge Service",
    description="Central coordinator for BrainSAIT Linc agents",
    version="1.0.0"
)

# CORS middleware
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Add BrainSAIT OID middleware
app.add_middleware(
    BrainSAITOIDMiddleware,
    service_name="MasterLinc",
    service_oid=get_service_oid("masterlinc")
)

# Initialize components
redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
agent_registry = AgentRegistry()
event_bus = RedisEventBus(redis_url)
workflow_orchestrator = WorkflowOrchestrator(agent_registry, event_bus)


# Pydantic models
class AgentRegistrationRequest(BaseModel):
    name: str = Field(..., description="Agent name")
    oid: str = Field(..., description="BrainSAIT OID")
    capabilities: List[str] = Field(..., description="List of agent capabilities")
    endpoint: str = Field(..., description="Agent base URL")
    port: int = Field(..., description="Agent port")


class WorkflowRequest(BaseModel):
    workflow_type: str = Field(..., description="Type of workflow (claim_processing, eligibility_check, compliance_audit)")
    data: Dict[str, Any] = Field(..., description="Workflow input data")
    requester: Optional[str] = Field(None, description="Requesting service/user")


class WorkflowStatusResponse(BaseModel):
    workflow_id: str
    status: str
    current_stage: str
    progress: int
    events: List[Dict]
    result: Optional[Dict] = None


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "MasterLinc Bridge",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "redis_connected": await event_bus.health_check(),
        "registered_agents": len(agent_registry.list_agents())
    }


# Agent registration endpoints
@app.post("/agents/register")
async def register_agent(registration: AgentRegistrationRequest):
    """Register a new Linc agent"""
    try:
        agent_info = AgentInfo(
            name=registration.name,
            oid=registration.oid,
            capabilities=registration.capabilities,
            endpoint=registration.endpoint,
            port=registration.port
        )
        
        agent_registry.register(agent_info)
        
        logger.info(f"Agent registered: {registration.name} ({registration.oid})")
        
        return {
            "status": "registered",
            "agent": {
                "name": registration.name,
                "oid": registration.oid,
                "capabilities": registration.capabilities,
                "endpoint": registration.endpoint
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Agent registration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@app.get("/agents")
async def list_agents():
    """List all registered agents"""
    agents = agent_registry.list_agents()
    return {
        "agents": [
            {
                "name": agent.name,
                "oid": agent.oid,
                "capabilities": agent.capabilities,
                "endpoint": agent.endpoint,
                "status": agent.status,
                "last_heartbeat": agent.last_heartbeat.isoformat() if agent.last_heartbeat else None
            }
            for agent in agents
        ],
        "total": len(agents),
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/agents/{agent_name}")
async def get_agent(agent_name: str):
    """Get details of a specific agent"""
    agent = agent_registry.get_agent(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")
    
    return {
        "name": agent.name,
        "oid": agent.oid,
        "capabilities": agent.capabilities,
        "endpoint": agent.endpoint,
        "status": agent.status,
        "last_heartbeat": agent.last_heartbeat.isoformat() if agent.last_heartbeat else None
    }


@app.post("/agents/{agent_name}/heartbeat")
async def agent_heartbeat(agent_name: str):
    """Update agent heartbeat"""
    agent = agent_registry.get_agent(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")
    
    agent_registry.update_heartbeat(agent_name)
    
    return {
        "status": "acknowledged",
        "agent": agent_name,
        "timestamp": datetime.utcnow().isoformat()
    }


# Workflow orchestration endpoints
@app.post("/workflows/start")
async def start_workflow(workflow_req: WorkflowRequest, background_tasks: BackgroundTasks):
    """Start a new workflow"""
    try:
        workflow_id = await workflow_orchestrator.start_workflow(
            workflow_type=workflow_req.workflow_type,
            data=workflow_req.data,
            requester=workflow_req.requester
        )
        
        # Execute workflow in background
        background_tasks.add_task(
            workflow_orchestrator.execute_workflow,
            workflow_id
        )
        
        return {
            "workflow_id": workflow_id,
            "status": "started",
            "workflow_type": workflow_req.workflow_type,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Workflow start failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start workflow: {str(e)}")


@app.get("/workflows/{workflow_id}")
async def get_workflow_status(workflow_id: str) -> WorkflowStatusResponse:
    """Get workflow status"""
    workflow = workflow_orchestrator.get_workflow_status(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found")
    
    return WorkflowStatusResponse(**workflow)


@app.get("/workflows")
async def list_workflows(
    status: Optional[str] = None,
    limit: int = 50
):
    """List workflows"""
    workflows = workflow_orchestrator.list_workflows(status=status, limit=limit)
    
    return {
        "workflows": workflows,
        "total": len(workflows),
        "timestamp": datetime.utcnow().isoformat()
    }


# Event streaming endpoints
@app.get("/events/stream/{workflow_id}")
async def stream_workflow_events(workflow_id: str):
    """Stream workflow events (SSE endpoint)"""
    # This would implement Server-Sent Events for real-time updates
    # For now, return the current events
    events = await event_bus.get_workflow_events(workflow_id)
    
    return {
        "workflow_id": workflow_id,
        "events": events,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/events/history/{workflow_id}")
async def get_workflow_history(workflow_id: str):
    """Get workflow event history"""
    events = await event_bus.get_workflow_events(workflow_id)
    
    return {
        "workflow_id": workflow_id,
        "events": events,
        "total": len(events),
        "timestamp": datetime.utcnow().isoformat()
    }


# Initialize agents on startup
@app.on_event("startup")
async def startup_event():
    """Initialize agents on startup"""
    logger.info("MasterLinc Bridge starting up...")
    
    # Pre-register known agents
    known_agents = {
        "ClaimLinc": {
            "oid": "1.3.6.1.4.1.61026.3.3.1",
            "capabilities": ["process_claim", "track_status", "handle_denial"],
            "endpoint": os.getenv("CLAIMLINC_URL", "http://claimlinc-agent:4001"),
            "port": 4001
        },
        "AuthLinc": {
            "oid": "1.3.6.1.4.1.61026.3.3.2",
            "capabilities": ["verify_eligibility", "request_prior_auth"],
            "endpoint": os.getenv("AUTHLINC_URL", "http://authlinc-agent:4002"),
            "port": 4002
        },
        "ComplianceLinc": {
            "oid": "1.3.6.1.4.1.61026.3.3.3",
            "capabilities": ["audit_claim", "validate_nphies", "check_pdpl"],
            "endpoint": os.getenv("COMPLIANCELINC_URL", "http://compliancelinc-agent:4003"),
            "port": 4003
        },
        "ClinicalLinc": {
            "oid": "1.3.6.1.4.1.61026.3.3.4",
            "capabilities": ["suggest_codes", "validate_diagnosis"],
            "endpoint": os.getenv("CLINICALLINC_URL", "http://clinicallinc-agent:4004"),
            "port": 4004
        }
    }
    
    for name, config in known_agents.items():
        try:
            agent_info = AgentInfo(
                name=name,
                oid=config["oid"],
                capabilities=config["capabilities"],
                endpoint=config["endpoint"],
                port=config["port"]
            )
            agent_registry.register(agent_info)
            logger.info(f"Pre-registered agent: {name}")
        except Exception as e:
            logger.warning(f"Failed to pre-register {name}: {e}")
    
    # Connect to Redis
    await event_bus.connect()
    logger.info("MasterLinc Bridge startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("MasterLinc Bridge shutting down...")
    await event_bus.disconnect()
    logger.info("MasterLinc Bridge shutdown complete")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "4000"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True
    )
