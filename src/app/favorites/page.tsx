import { FavoritesView } from "@/components/favorites/favorites-view";
export const metadata={title:"Избранное",robots:{index:false,follow:false}};
export default function FavoritesPage(){return <div className="mx-auto grid max-w-3xl gap-5"><h1 className="text-3xl font-semibold">Избранное</h1><FavoritesView/></div>;}
