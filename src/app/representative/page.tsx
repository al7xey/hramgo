import type {Metadata} from 'next';
import {RepresentativeDashboard} from '@/components/representative/representative-dashboard';
export const metadata:Metadata={title:'Представителю храма',robots:{index:false,follow:false},alternates:{canonical:null}};
export default function Page(){return <RepresentativeDashboard/>;}
