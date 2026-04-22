import asyncio, sys, os
sys.path.insert(0, r'c:\Users\baye.dame.thiam\Desktop\outil supervision\pnvd-backend')
os.environ['PYTHONIOENCODING'] = 'utf-8'
sys.stdout.reconfigure(encoding='utf-8')

async def check():
    from core.database import engine, Article, ArticleMinistryLink
    from sqlalchemy import select, func
    from sqlalchemy.ext.asyncio import AsyncSession
    from datetime import datetime

    async with AsyncSession(engine) as db:
        # YouTube articles in ministry links
        res2 = await db.execute(
            select(ArticleMinistryLink.ministry_id, func.count())
            .join(Article, Article.id == ArticleMinistryLink.article_id)
            .where(Article.platform == "YouTube")
            .group_by(ArticleMinistryLink.ministry_id)
        )
        rows = res2.all()
        print("YouTube articles tagged to ministries:")
        if rows:
            for mid, cnt in rows:
                print(f"  {mid}: {cnt}")
        else:
            print("  NONE")

        # Check YouTube article dates range
        res3 = await db.execute(
            select(func.min(Article.published_at), func.max(Article.published_at))
            .where(Article.platform == "YouTube")
        )
        mn, mx = res3.one()
        print(f"YouTube date range: {mn} to {mx}")
        if mx:
            delta = datetime.utcnow() - mx
            print(f"Most recent YouTube is {delta.days}d {delta.seconds//3600}h ago")

        # All platforms for all tagged articles
        res4 = await db.execute(
            select(Article.platform, func.count())
            .join(ArticleMinistryLink, ArticleMinistryLink.article_id == Article.id)
            .group_by(Article.platform)
        )
        print("\nPlatforms across all tagged ministry articles:")
        for plat, cnt in res4.all():
            print(f"  {plat}: {cnt}")

asyncio.run(check())
