import WorkListing from '@/app/components/work/work-listing';

export const metadata = { title: 'Videos' };
export const dynamic = 'force-dynamic';

export default function VideosPage() {
    return <WorkListing type="video" />;
}
