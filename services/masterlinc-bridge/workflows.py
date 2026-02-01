"""
Workflow State Machine and Orchestration
Manages workflow execution and state transitions
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
import uuid
import logging
import httpx

from agents import AgentRegistry, AgentInfo

logger = logging.getLogger(__name__)


class WorkflowStatus(Enum):
    """Workflow status enumeration"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class WorkflowEvent:
    """Workflow event"""
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    workflow_id: str = ""
    stage: str = ""
    status: str = ""
    message: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "event_id": self.event_id,
            "workflow_id": self.workflow_id,
            "stage": self.stage,
            "status": self.status,
            "message": self.message,
            "data": self.data,
            "timestamp": self.timestamp.isoformat()
        }


@dataclass
class Workflow:
    """Workflow instance"""
    workflow_id: str
    workflow_type: str
    status: WorkflowStatus
    current_stage: str
    data: Dict[str, Any]
    events: List[WorkflowEvent] = field(default_factory=list)
    result: Optional[Dict[str, Any]] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    requester: Optional[str] = None
    
    @property
    def progress(self) -> int:
        """Calculate workflow progress percentage"""
        stages = self._get_stages_for_type()
        if not stages:
            return 0
        
        current_idx = stages.index(self.current_stage) if self.current_stage in stages else 0
        return int((current_idx / len(stages)) * 100)
    
    def _get_stages_for_type(self) -> List[str]:
        """Get stages for workflow type"""
        stages_map = {
            "claim_processing": [
                "received",
                "compliance_audit",
                "normalization",
                "financial_rules",
                "signing",
                "nphies_submission",
                "completed"
            ],
            "eligibility_check": [
                "received",
                "eligibility_verification",
                "completed"
            ],
            "compliance_audit": [
                "received",
                "nphies_validation",
                "pdpl_check",
                "completed"
            ]
        }
        return stages_map.get(self.workflow_type, ["received", "processing", "completed"])
    
    def add_event(self, event: WorkflowEvent):
        """Add event to workflow"""
        event.workflow_id = self.workflow_id
        self.events.append(event)
        self.updated_at = datetime.utcnow()


class WorkflowOrchestrator:
    """
    Orchestrates workflow execution across agents
    """
    
    def __init__(self, agent_registry: AgentRegistry, event_bus):
        self.agent_registry = agent_registry
        self.event_bus = event_bus
        self._workflows: Dict[str, Workflow] = {}
    
    async def start_workflow(
        self,
        workflow_type: str,
        data: Dict[str, Any],
        requester: Optional[str] = None
    ) -> str:
        """
        Start a new workflow
        
        Args:
            workflow_type: Type of workflow
            data: Workflow input data
            requester: Requesting service/user
            
        Returns:
            Workflow ID
        """
        workflow_id = f"WF-{str(uuid.uuid4())[:8]}"
        
        workflow = Workflow(
            workflow_id=workflow_id,
            workflow_type=workflow_type,
            status=WorkflowStatus.PENDING,
            current_stage="received",
            data=data,
            requester=requester
        )
        
        self._workflows[workflow_id] = workflow
        
        # Publish event
        event = WorkflowEvent(
            workflow_id=workflow_id,
            stage="received",
            status="started",
            message=f"Workflow {workflow_type} started",
            data={"workflow_type": workflow_type}
        )
        workflow.add_event(event)
        await self.event_bus.publish_event(workflow_id, event)
        
        logger.info(f"Workflow started: {workflow_id} ({workflow_type})")
        
        return workflow_id
    
    async def execute_workflow(self, workflow_id: str):
        """
        Execute workflow
        
        Args:
            workflow_id: Workflow ID
        """
        workflow = self._workflows.get(workflow_id)
        if not workflow:
            logger.error(f"Workflow not found: {workflow_id}")
            return
        
        try:
            workflow.status = WorkflowStatus.RUNNING
            
            if workflow.workflow_type == "claim_processing":
                await self._execute_claim_processing(workflow)
            elif workflow.workflow_type == "eligibility_check":
                await self._execute_eligibility_check(workflow)
            elif workflow.workflow_type == "compliance_audit":
                await self._execute_compliance_audit(workflow)
            else:
                raise ValueError(f"Unknown workflow type: {workflow.workflow_type}")
            
            workflow.status = WorkflowStatus.COMPLETED
            workflow.current_stage = "completed"
            
            event = WorkflowEvent(
                workflow_id=workflow_id,
                stage="completed",
                status="success",
                message="Workflow completed successfully"
            )
            workflow.add_event(event)
            await self.event_bus.publish_event(workflow_id, event)
            
        except Exception as e:
            logger.error(f"Workflow execution failed: {workflow_id} - {e}")
            workflow.status = WorkflowStatus.FAILED
            
            event = WorkflowEvent(
                workflow_id=workflow_id,
                stage=workflow.current_stage,
                status="failed",
                message=f"Workflow failed: {str(e)}"
            )
            workflow.add_event(event)
            await self.event_bus.publish_event(workflow_id, event)
    
    async def _execute_claim_processing(self, workflow: Workflow):
        """Execute claim processing workflow"""
        # Stage 1: Compliance Audit
        workflow.current_stage = "compliance_audit"
        audit_result = await self._call_agent("ComplianceLinc", "audit_claim", workflow.data)
        workflow.add_event(WorkflowEvent(
            stage="compliance_audit",
            status="completed",
            message="Compliance audit completed",
            data=audit_result
        ))
        
        # Stage 2: Normalization
        workflow.current_stage = "normalization"
        normalized_result = await self._call_service(
            "http://normalizer-service:8000/normalize",
            workflow.data
        )
        workflow.add_event(WorkflowEvent(
            stage="normalization",
            status="completed",
            message="Normalization completed",
            data=normalized_result
        ))
        
        # Stage 3: Financial Rules
        workflow.current_stage = "financial_rules"
        financial_result = await self._call_service(
            "http://financial-rules-engine:8002/apply-rules",
            normalized_result
        )
        workflow.add_event(WorkflowEvent(
            stage="financial_rules",
            status="completed",
            message="Financial rules applied",
            data=financial_result
        ))
        
        # Stage 4: Signing
        workflow.current_stage = "signing"
        signed_result = await self._call_service(
            "http://signer-service:8001/sign",
            financial_result
        )
        workflow.add_event(WorkflowEvent(
            stage="signing",
            status="completed",
            message="Claim signed",
            data=signed_result
        ))
        
        # Stage 5: NPHIES Submission
        workflow.current_stage = "nphies_submission"
        submission_result = await self._call_service(
            "http://nphies-bridge:8003/submit",
            signed_result
        )
        workflow.add_event(WorkflowEvent(
            stage="nphies_submission",
            status="completed",
            message="Submitted to NPHIES",
            data=submission_result
        ))
        
        workflow.result = submission_result
    
    async def _execute_eligibility_check(self, workflow: Workflow):
        """Execute eligibility check workflow"""
        workflow.current_stage = "eligibility_verification"
        
        result = await self._call_agent("AuthLinc", "verify_eligibility", workflow.data)
        
        workflow.add_event(WorkflowEvent(
            stage="eligibility_verification",
            status="completed",
            message="Eligibility verified",
            data=result
        ))
        
        workflow.result = result
    
    async def _execute_compliance_audit(self, workflow: Workflow):
        """Execute compliance audit workflow"""
        workflow.current_stage = "compliance_audit"
        
        result = await self._call_agent("ComplianceLinc", "audit_claim", workflow.data)
        
        workflow.add_event(WorkflowEvent(
            stage="compliance_audit",
            status="completed",
            message="Compliance audit completed",
            data=result
        ))
        
        workflow.result = result
    
    async def _call_agent(
        self,
        agent_name: str,
        capability: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Call an agent
        
        Args:
            agent_name: Name of the agent
            capability: Capability to invoke
            data: Request data
            
        Returns:
            Response data
        """
        agent = self.agent_registry.get_agent(agent_name)
        if not agent:
            raise ValueError(f"Agent not found: {agent_name}")
        
        url = f"{agent.endpoint}/{capability}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=data)
            response.raise_for_status()
            return response.json()
    
    async def _call_service(self, url: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Call a service endpoint
        
        Args:
            url: Service URL
            data: Request data
            
        Returns:
            Response data
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=data)
            response.raise_for_status()
            return response.json()
    
    def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get workflow status"""
        workflow = self._workflows.get(workflow_id)
        if not workflow:
            return None
        
        return {
            "workflow_id": workflow.workflow_id,
            "status": workflow.status.value,
            "current_stage": workflow.current_stage,
            "progress": workflow.progress,
            "events": [event.to_dict() for event in workflow.events],
            "result": workflow.result
        }
    
    def list_workflows(
        self,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List workflows"""
        workflows = list(self._workflows.values())
        
        if status:
            try:
                status_enum = WorkflowStatus(status)
                workflows = [w for w in workflows if w.status == status_enum]
            except ValueError:
                pass
        
        # Sort by created_at descending
        workflows.sort(key=lambda w: w.created_at, reverse=True)
        
        # Limit results
        workflows = workflows[:limit]
        
        return [
            {
                "workflow_id": w.workflow_id,
                "workflow_type": w.workflow_type,
                "status": w.status.value,
                "current_stage": w.current_stage,
                "progress": w.progress,
                "created_at": w.created_at.isoformat(),
                "updated_at": w.updated_at.isoformat()
            }
            for w in workflows
        ]
