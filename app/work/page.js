import WorkListing from '@/app/components/work/work-listing';

export const metadata = { title: 'Work' };
export const dynamic = 'force-dynamic';

export default function WorkPage() {
    return <WorkListing />;
}
