"""
Redis Event Bus for workflow event streaming
"""

import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio

try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)


class RedisEventBus:
    """
    Redis-based event bus for workflow events
    Uses Redis Streams for event streaming
    """
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.redis_client = None
        self._connected = False
    
    async def connect(self):
        """Connect to Redis"""
        if not REDIS_AVAILABLE:
            logger.warning("Redis not available, event streaming disabled")
            return
        
        try:
            self.redis_client = await aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            self._connected = True
            logger.info(f"Connected to Redis: {self.redis_url}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self._connected = False
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis_client and self._connected:
            await self.redis_client.close()
            self._connected = False
            logger.info("Disconnected from Redis")
    
    async def health_check(self) -> bool:
        """Check Redis connection health"""
        if not self._connected or not self.redis_client:
            return False
        
        try:
            await self.redis_client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            self._connected = False
            return False
    
    async def publish_event(self, workflow_id: str, event: Any):
        """
        Publish workflow event to Redis Stream
        
        Args:
            workflow_id: Workflow ID
            event: Event object (must have to_dict method)
        """
        if not self._connected or not self.redis_client:
            logger.warning("Redis not connected, skipping event publish")
            return
        
        try:
            stream_key = f"workflow:{workflow_id}:events"
            event_data = event.to_dict() if hasattr(event, 'to_dict') else dict(event)
            
            # Add to stream
            await self.redis_client.xadd(
                stream_key,
                event_data,
                maxlen=1000  # Keep last 1000 events
            )
            
            # Also store in a list for easier retrieval
            list_key = f"workflow:{workflow_id}:events:list"
            await self.redis_client.rpush(
                list_key,
                json.dumps(event_data)
            )
            
            # Set expiration (7 days)
            await self.redis_client.expire(list_key, 60 * 60 * 24 * 7)
            await self.redis_client.expire(stream_key, 60 * 60 * 24 * 7)
            
            logger.debug(f"Published event to workflow {workflow_id}")
            
        except Exception as e:
            logger.error(f"Failed to publish event: {e}")
    
    async def get_workflow_events(
        self,
        workflow_id: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get workflow events
        
        Args:
            workflow_id: Workflow ID
            limit: Maximum number of events to return
            
        Returns:
            List of events
        """
        if not self._connected or not self.redis_client:
            return []
        
        try:
            list_key = f"workflow:{workflow_id}:events:list"
            
            # Get events from list
            events_json = await self.redis_client.lrange(list_key, -limit, -1)
            
            events = []
            for event_json in events_json:
                try:
                    event = json.loads(event_json)
                    events.append(event)
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse event JSON: {e}")
            
            return events
            
        except Exception as e:
            logger.error(f"Failed to get workflow events: {e}")
            return []
    
    async def subscribe_to_workflow(
        self,
        workflow_id: str,
        callback
    ):
        """
        Subscribe to workflow events
        
        Args:
            workflow_id: Workflow ID
            callback: Callback function to handle events
        """
        if not self._connected or not self.redis_client:
            logger.warning("Redis not connected, cannot subscribe")
            return
        
        try:
            stream_key = f"workflow:{workflow_id}:events"
            
            # Start reading from the stream
            last_id = "0-0"
            
            while True:
                # Read new messages
                messages = await self.redis_client.xread(
                    {stream_key: last_id},
                    count=10,
                    block=1000  # Block for 1 second
                )
                
                if messages:
                    for stream, message_list in messages:
                        for message_id, data in message_list:
                            last_id = message_id
                            await callback(data)
                
        except asyncio.CancelledError:
            logger.info(f"Subscription cancelled for workflow {workflow_id}")
        except Exception as e:
            logger.error(f"Error in workflow subscription: {e}")
    
    async def get_workflow_metrics(self, workflow_id: str) -> Dict[str, Any]:
        """
        Get workflow metrics
        
        Args:
            workflow_id: Workflow ID
            
        Returns:
            Workflow metrics
        """
        if not self._connected or not self.redis_client:
            return {}
        
        try:
            stream_key = f"workflow:{workflow_id}:events"
            
            # Get stream info
            info = await self.redis_client.xinfo_stream(stream_key)
            
            return {
                "length": info.get("length", 0),
                "first_entry_id": info.get("first-entry", {}).get("id"),
                "last_entry_id": info.get("last-entry", {}).get("id"),
            }
            
        except Exception as e:
            logger.error(f"Failed to get workflow metrics: {e}")
            return {}
