import json
import importlib.util
from pathlib import Path
import sys


def load_copilot_routes_module():
    repo_root = Path(__file__).resolve().parents[3]
    normalizer_dir = repo_root / "normalizer-service"
    target = normalizer_dir / "copilot_routes.py"

    # Ensure normalizer-service modules (e.g., feature_flags.py) can be imported.
    if str(normalizer_dir) not in sys.path:
        sys.path.insert(0, str(normalizer_dir))
    spec = importlib.util.spec_from_file_location("copilot_routes", str(target))
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_structured_json_wrapper_wraps_plain_text():
    m = load_copilot_routes_module()
    out = m._ensure_structured_json_reply("hello")
    obj = json.loads(out)
    assert obj["reply"] == "hello"


def test_phi_suspected_requires_two_signals():
    m = load_copilot_routes_module()
    assert m._phi_suspected("patient") is False
    assert m._phi_suspected("patient iqama 123456789") is True


def test_copilot_refuses_phi():
    m = load_copilot_routes_module()
    req = m.CopilotChatRequest(message="patient iqama 123456789", context={})
    res = m.copilot_chat(req)
    obj = json.loads(res["reply"])
    assert obj["category"] == "security"
