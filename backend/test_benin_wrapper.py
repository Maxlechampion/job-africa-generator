from app.services.scheduler import run_all_collectors_with_benin

result = run_all_collectors_with_benin()

print()
print("=" * 60)
print(f"TOTAL COLLECTED : {result['total_collected']}")
print(f"TOTAL INSERTED  : {result['total_inserted']}")
print("=" * 60)
print()

print("Sources Benin detectees :")
for d in result["details"]:
    src = d.get("source", "")
    if "Benin" in src or "Temp" in src or "Bénin" in src:
        print(f"  - {src} : {d.get('collected', 0)} collectees, {d.get('inserted', 0)} inserees")

print()
print("Sources en erreur :")
for d in result["details"]:
    if d.get("status") == "error":
        print(f"  - {d.get('source')} : {d.get('error', '')[:80]}")