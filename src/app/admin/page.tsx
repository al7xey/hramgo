import type {Metadata} from 'next';
import {ModerationDashboard} from '@/components/admin/moderation-dashboard';
export const metadata:Metadata={title:'Модерация',robots:{index:false,follow:false},alternates:{canonical:null}};
export default function Page(){return <ModerationDashboard/>;}
