from app import create_app

app = create_app()

with app.test_client() as client:
    # Check available routes
    print("Available routes:")
    for rule in app.url_map.iter_rules():
        if 'profile' in rule.rule or 'password' in rule.rule or 'settings' in rule.rule:
            print(f"  {rule.rule} {rule.methods}")
