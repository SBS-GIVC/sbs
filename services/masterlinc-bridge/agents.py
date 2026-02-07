"""
Agent Registry and Management
Handles registration and tracking of Linc agents
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional
from enum import Enum


class AgentStatus(Enum):
    """Agent status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    UNKNOWN = "unknown"


@dataclass
class AgentInfo:
    """Agent information"""
    name: str
    oid: str
    capabilities: List[str]
    endpoint: str
    port: int
    status: AgentStatus = AgentStatus.UNKNOWN
    last_heartbeat: Optional[datetime] = None
    metadata: Dict = field(default_factory=dict)
    
    def __post_init__(self):
        """Initialize agent info"""
        if isinstance(self.status, str):
            self.status = AgentStatus(self.status)


class AgentRegistry:
    """
    Registry for managing Linc agents
    Tracks agent registration, status, and capabilities
    """
    
    def __init__(self):
        self._agents: Dict[str, AgentInfo] = {}
        self._capability_index: Dict[str, List[str]] = {}
    
    def register(self, agent_info: AgentInfo) -> None:
        """
        Register a new agent
        
        Args:
            agent_info: Agent information
        """
        agent_info.status = AgentStatus.ACTIVE
        agent_info.last_heartbeat = datetime.utcnow()
        
        self._agents[agent_info.name] = agent_info
        
        # Index capabilities
        for capability in agent_info.capabilities:
            if capability not in self._capability_index:
                self._capability_index[capability] = []
            if agent_info.name not in self._capability_index[capability]:
                self._capability_index[capability].append(agent_info.name)
    
    def unregister(self, agent_name: str) -> bool:
        """
        Unregister an agent
        
        Args:
            agent_name: Name of the agent to unregister
            
        Returns:
            True if successful, False if agent not found
        """
        if agent_name not in self._agents:
            return False
        
        agent_info = self._agents[agent_name]
        
        # Remove from capability index
        for capability in agent_info.capabilities:
            if capability in self._capability_index:
                if agent_name in self._capability_index[capability]:
                    self._capability_index[capability].remove(agent_name)
        
        del self._agents[agent_name]
        return True
    
    def get_agent(self, agent_name: str) -> Optional[AgentInfo]:
        """
        Get agent information
        
        Args:
            agent_name: Name of the agent
            
        Returns:
            Agent information or None if not found
        """
        return self._agents.get(agent_name)
    
    def list_agents(self, status: Optional[AgentStatus] = None) -> List[AgentInfo]:
        """
        List all registered agents
        
        Args:
            status: Optional filter by status
            
        Returns:
            List of agent information
        """
        if status is None:
            return list(self._agents.values())
        
        return [
            agent for agent in self._agents.values()
            if agent.status == status
        ]
    
    def find_agents_by_capability(self, capability: str) -> List[AgentInfo]:
        """
        Find agents with a specific capability
        
        Args:
            capability: The capability to search for
            
        Returns:
            List of agents with the capability
        """
        agent_names = self._capability_index.get(capability, [])
        return [self._agents[name] for name in agent_names if name in self._agents]
    
    def update_heartbeat(self, agent_name: str) -> bool:
        """
        Update agent heartbeat
        
        Args:
            agent_name: Name of the agent
            
        Returns:
            True if successful, False if agent not found
        """
        if agent_name not in self._agents:
            return False
        
        self._agents[agent_name].last_heartbeat = datetime.utcnow()
        self._agents[agent_name].status = AgentStatus.ACTIVE
        return True
    
    def update_status(self, agent_name: str, status: AgentStatus) -> bool:
        """
        Update agent status
        
        Args:
            agent_name: Name of the agent
            status: New status
            
        Returns:
            True if successful, False if agent not found
        """
        if agent_name not in self._agents:
            return False
        
        self._agents[agent_name].status = status
        return True
    
    def check_stale_agents(self, timeout_seconds: int = 300) -> List[str]:
        """
        Check for agents that haven't sent heartbeat recently
        
        Args:
            timeout_seconds: Timeout in seconds
            
        Returns:
            List of stale agent names
        """
        now = datetime.utcnow()
        stale_agents = []
        
        for agent_name, agent_info in self._agents.items():
            if agent_info.last_heartbeat is None:
                continue
            
            time_diff = (now - agent_info.last_heartbeat).total_seconds()
            if time_diff > timeout_seconds:
                stale_agents.append(agent_name)
                agent_info.status = AgentStatus.INACTIVE
        
        return stale_agents
