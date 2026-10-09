import WorkListing from '@/app/components/work/work-listing';

export const metadata = { title: 'Photos' };
export const dynamic = 'force-dynamic';

export default function PhotosPage() {
    return <WorkListing type="photo" />;
}
