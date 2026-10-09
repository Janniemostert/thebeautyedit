import Link from 'next/link';
import WorkCard from './components/work/work-card';
import { getPublishedWork, getViewer } from '@/lib/work';
import { site } from '@/lib/site';
import classes from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [{ isActive }, featured, latest] = await Promise.all([
    getViewer(),
    getPublishedWork({ featuredOnly: true, limit: 6 }),
    getPublishedWork({ limit: 6 }),
  ]);
  const showcase = featured.length > 0 ? featured : latest;

  return (
    <>
      <section className={classes.hero}>
        <div className={classes.heroGlow} aria-hidden="true" />
        <p className={classes.eyebrow}>Beauty creator</p>
        <h1>
          The <span className={classes.heroMark}>Beauty</span> Edit
        </h1>
        <p className={classes.heroBy}>{site.by}</p>
        <p className={classes.tagline}>{site.tagline}</p>
        <div className={classes.cta}>
          <Link href="/work" className={classes.primaryBtn}>View the work</Link>
          <Link href="/videos" className={classes.ghostBtn}>Watch videos</Link>
        </div>
      </section>

      <main className={classes.main}>
        <section className={classes.section}>
          <div className={classes.sectionHead}>
            <h2>{featured.length > 0 ? 'Featured' : 'Latest'}</h2>
            <Link href="/work">See all →</Link>
          </div>

          {showcase.length === 0 ? (
            <p className={classes.empty}>No work published yet. The first pieces are on their way.</p>
          ) : (
            <div className={classes.grid}>
              {showcase.map((w) => (
                <WorkCard key={w._id} work={w} locked={w.isSubscriberOnly && !isActive} />
              ))}
            </div>
          )}
        </section>

        <section className={classes.about} id="about">
          <h2>About</h2>
          <p>
            The Beauty Edit by EL is a growing collection of makeup looks, transformations,
            tutorials and beauty advice from a professional makeup artist and consultant.
            Browse the looks, watch the latest videos, and sign in with Google to join the
            conversation or book a consultation.
          </p>
          <a href={`mailto:${site.contactEmail}`} className={classes.ghostBtn}>Get in touch</a>
        </section>
      </main>
    </>
  );
}
