from models import ScrapedItem
from utils.logging import write_log


def upsert_scraped_item(db, result):
    item = db.query(ScrapedItem).filter_by(sku=result["sku"]).first()

    if item:
        item.title = result["title"]
        item.price = result["price"]
        item.availability = result.get("availability")
        item.brand = result.get("brand")
        item.model = result.get("model")
        item.url = result.get("url")
        item.image = result.get("image")
        item.source_url = result.get("source_url")
        write_log(db, "INFO", f"Updated SKU {result['sku']}")
    else:
        db.add(
            ScrapedItem(
                sku=result["sku"],
                title=result["title"],
                price=result["price"],
                availability=result.get("availability"),
                brand=result.get("brand"),
                model=result.get("model"),
                url=result.get("url"),
                image=result.get("image"),
                source_url=result.get("source_url"),
            )
        )
        write_log(db, "INFO", f"Inserted SKU {result['sku']}")
