import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTempleBySlug,readCatalog } from '@/features/temples/repository';
import { TempleReviews } from '@/components/reviews/temple-reviews';
export const dynamicParams=false;
export async function generateStaticParams(){return (await readCatalog()).map(t=>({slug:t.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const t=await getTempleBySlug(slug);return {title:`Отзывы: ${t?.name??'храм'}`,alternates:{canonical:`/temples/${slug}/reviews/`}};}
export default async function ReviewsPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const t=await getTempleBySlug(slug);if(!t)notFound();return <div className="mx-auto grid max-w-3xl gap-5"><Link href={'/temples/'+slug+'/'} className="text-sm text-primary underline">← К храму</Link><h1 className="text-3xl font-semibold">Отзывы посетителей</h1><p className="text-muted-foreground">{t.name}</p><TempleReviews templeId={t.id}/></div>;}
