import time
import random
import threading
from functools import wraps

class CircuitOpen(Exception):
    pass

class CircuitBreaker:
    """Simple circuit breaker implementation."""
    def __init__(self, max_failures=5, reset_timeout=30):
        self.max_failures = max_failures
        self.reset_timeout = reset_timeout
        self.failures = 0
        self.state = 'CLOSED'
        self.lock = threading.Lock()
        self.opened_since = None

    def _trip(self):
        self.state = 'OPEN'
        self.opened_since = time.time()

    def _reset(self):
        self.failures = 0
        self.state = 'CLOSED'
        self.opened_since = None

    def call(self, func, *args, **kwargs):
        with self.lock:
            if self.state == 'OPEN':
                if time.time() - self.opened_since > self.reset_timeout:
                    self.state = 'HALF'
                else:
                    raise CircuitOpen('Circuit is open')
        try:
            result = func(*args, **kwargs)
        except Exception as exc:
            with self.lock:
                self.failures += 1
                if self.failures >= self.max_failures:
                    self._trip()
            raise
        else:
            with self.lock:
                if self.state == 'HALF':
                    self._reset()
                else:
                    self.failures = 0
            return result


def retry(exceptions, tries=3, delay=0.5, backoff=2, jitter=0.1):
    """Retry decorator with exponential backoff and jitter."""
    def deco_retry(f):
        @wraps(f)
        def f_retry(*args, **kwargs):
            mtries, mdelay = tries, delay
            while mtries > 1:
                try:
                    return f(*args, **kwargs)
                except exceptions as e:
                    # apply jitter
                    jitter_val = random.uniform(0, jitter)
                    time.sleep(mdelay + jitter_val)
                    mtries -= 1
                    mdelay *= backoff
            return f(*args, **kwargs)
        return f_retry
    return deco_retry
