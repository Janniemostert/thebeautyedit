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
        <p className={classes.eyebrow}>Creator portfolio</p>
        <h1>
          <span className={classes.heroMark}>EJ</span> Edit
        </h1>
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
            EJ Edit is a growing collection of photo and video projects: colour work, retouching,
            cuts and motion pieces. Browse the gallery, watch the latest edits, and sign in with
            Google to join the conversation.
          </p>
          <a href={`mailto:${site.contactEmail}`} className={classes.ghostBtn}>Get in touch</a>
        </section>
      </main>
    </>
  );
}
