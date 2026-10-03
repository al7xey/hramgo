import type { Metadata } from 'next';
import { MyReviews } from '@/components/profile/my-reviews';
export const metadata:Metadata={title:'Мои отзывы',robots:{index:false,follow:false}};
export default function Page(){return <MyReviews/>;}
