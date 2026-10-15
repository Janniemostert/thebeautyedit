import Link from 'next/link';
import Image from 'next/image';
import WorkCard from './components/work/work-card';
import { getPublishedWork, getViewer } from '@/lib/work';
import { getServices } from '@/lib/booking';
import { formatDuration } from '@/lib/time';
import { site, LOGO_SRC } from '@/lib/site';
import classes from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [{ isActive }, featured, latest, services] = await Promise.all([
    getViewer(),
    getPublishedWork({ featuredOnly: true, limit: 6 }),
    getPublishedWork({ limit: 6 }),
    getServices(),
  ]);
  const showcase = featured.length > 0 ? featured : latest;

  return (
    <>
      <section className={classes.hero}>
        {/* Three glow layers slowly cross-fade: pink → purple → gold. Remove the last two to revert. */}
        <div className={`${classes.heroGlow} ${classes.glowPink}`} aria-hidden="true" />
        <div className={`${classes.heroGlow} ${classes.glowPurple}`} aria-hidden="true" />
        <div className={`${classes.heroGlow} ${classes.glowGold}`} aria-hidden="true" />
        <h1 className={classes.heroLogo}>
          <Image src={LOGO_SRC} alt={site.fullName} width={260} height={260} priority />
        </h1>
        <p className={classes.eyebrow}>Beauty creator</p>
        <p className={classes.tagline}>{site.tagline}</p>
        <div className={classes.cta}>
          <Link href="/book" className={classes.primaryBtn}>Book an appointment</Link>
          <Link href="/content" className={classes.ghostBtn}>Watch my content</Link>
        </div>
      </section>

      <main className={classes.main}>
        {/* Two ways in: watch the content, or book a session. */}
        <section className={classes.paths} aria-label="Get started">
          <Link href="/videos" className={classes.path}>
            <span className={classes.pathIcon} aria-hidden="true">▶</span>
            <span className={classes.pathTitle}>Watch</span>
            <span className={classes.pathText}>Looks, transformations, tutorials and behind-the-scenes videos.</span>
            <span className={classes.pathLink}>Browse the content →</span>
          </Link>
          <Link href="/book" className={`${classes.path} ${classes.pathBook}`}>
            <span className={classes.pathIcon} aria-hidden="true">✦</span>
            <span className={classes.pathTitle}>Book</span>
            <span className={classes.pathText}>Check open times and request an appointment. You&apos;ll get an email once it&apos;s confirmed.</span>
            <span className={classes.pathLink}>See available times →</span>
          </Link>
        </section>

        <section className={classes.section}>
          <div className={classes.sectionHead}>
            <h2>{featured.length > 0 ? 'Featured' : 'Latest'}</h2>
            <Link href="/content">See all →</Link>
          </div>

          {showcase.length === 0 ? (
            <p className={classes.empty}>Nothing published yet. The first pieces are on their way.</p>
          ) : (
            <div className={classes.grid}>
              {showcase.map((w) => (
                <WorkCard key={w._id} work={w} locked={w.isSubscriberOnly && !isActive} />
              ))}
            </div>
          )}
        </section>

        {services.length > 0 && (
          <section className={classes.section} id="services">
            <div className={classes.sectionHead}>
              <h2>Services</h2>
              <Link href="/book">Book now →</Link>
            </div>
            <div className={classes.services}>
              {services.map((s) => (
                <Link key={s._id} href={`/book?service=${s._id}`} className={classes.service}>
                  <span className={classes.serviceName}>{s.name}</span>
                  <span className={classes.serviceMeta}>
                    {formatDuration(s.durationMinutes)}{s.price ? ` · ${s.price}` : ''}
                  </span>
                  {s.description && <span className={classes.serviceDesc}>{s.description}</span>}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className={classes.about} id="about">
          <h2>About</h2>
          <p>
            The Beauty Edit by EL is a growing collection of makeup looks, transformations,
            tutorials and beauty advice from a professional makeup artist and consultant.
            Browse the looks, watch the latest videos, or create an account to join the
            conversation and book an appointment.
          </p>
          <a href={`mailto:${site.contactEmail}`} className={classes.ghostBtn}>Get in touch</a>
        </section>
      </main>
    </>
  );
}
