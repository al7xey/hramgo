import { readFile } from 'node:fs/promises';
import { cache } from 'react';
import path from 'node:path';
import type { TempleView,TempleSearchInput,TempleCardView,TempleMapView } from './types';
import { searchTemples } from './search';
export const readCatalog=cache(async()=>JSON.parse(await readFile(path.join(process.cwd(),'data/temples.json'),'utf-8')) as TempleView[]);
export async function listTemples(input:TempleSearchInput={}){return searchTemples(await readCatalog(),input);}
export const listCardTemples=listTemples;
export const listMapTemples=listTemples;
export async function getTempleBySlug(slug:string){return (await readCatalog()).find(t=>t.slug===slug)??null;}
export async function listPublishedTempleSitemapEntries(){return readCatalog();}
export async function listTempleFeedEntries(limit=150){return (await readCatalog()).slice(0,limit).map(t=>({...t,updatedAt:t.lastVerifiedAt??'2026-08-10'}));}
export function toTempleCardDto(t:TempleView):TempleCardView{return {id:t.id,slug:t.slug,name:t.name,shortName:t.shortName,address:t.address,averageHelpfulnessRating:t.averageHelpfulnessRating,reviewsCount:t.reviewsCount,approvedReviewsCount:t.approvedReviewsCount,photos:t.photos.slice(0,1),transit:t.transit.slice(0,3)};}
export function toTempleMapDto(t:TempleView):TempleMapView{return {...toTempleCardDto(t),latitude:t.latitude,longitude:t.longitude,websiteUrl:t.websiteUrl,photoUrl:t.photos[0]?.imageUrl};}
