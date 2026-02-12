import afham_cli


def test_build_parser_contains_expected_commands():
    parser = afham_cli.build_parser()
    actions = [a for a in parser._actions if a.dest == "command"]
    assert actions
    command_choices = set(actions[0].choices.keys())
    assert {"readiness", "service-status"}.issubset(command_choices)


def test_main_invokes_readiness(monkeypatch):
    called = {}

    def fake_cmd(_):
        called["ran"] = True
        return 0

    monkeypatch.setattr(afham_cli, "cmd_readiness", fake_cmd)
    parser = afham_cli.build_parser()
    monkeypatch.setattr(afham_cli, "build_parser", lambda: parser)

    assert afham_cli.main(["readiness"]) == 0
    assert called["ran"] is True


def test_service_status_handles_missing_docker(monkeypatch):
    def fake_run(*args, **kwargs):
        raise FileNotFoundError

    monkeypatch.setattr(afham_cli.subprocess, "run", fake_run)
    assert afham_cli.main(["service-status"]) == 2
