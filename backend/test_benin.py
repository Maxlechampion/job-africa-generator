from app.collectors.scrapers.html_scraper import HTMLScraper

s = HTMLScraper()
html = s.fetch("https://benin-digital.com/emplois/")
soup = s.parse(html)

# Liens vers /emplois/
links = soup.select('a[href*="/emplois/"]')
print(f"{len(links)} liens vers /emplois/")
print()

for link in links[:20]:
    href = link.get("href", "")
    text = link.get_text(strip=True)[:70]
    print(f"  {text}  ->  {href}")

print()
print("=== Structure HTML ===")
print()

# Cherche les articles
for tag in ["article", "h2", "h3", ".post", ".job", ".emploi"]:
    elems = soup.select(tag)
    if elems:
        print(f"{tag} : {len(elems)} elements")
        first = elems[0]
        print(f"   HTML : {str(first)[:300]}")
        print()