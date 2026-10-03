"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSession } from "@/lib/auth/client";
import { getSupabase } from "@/lib/supabase/client";
type State={owner:string|null; ids:Set<string>; loading:boolean; error:string|null};
const Context=createContext<{ids:Set<string>;loading:boolean;error:string|null;toggle:(id:string)=>Promise<void>;reload:()=>void}>({ids:new Set(),loading:true,error:null,toggle:async()=>{},reload:()=>{}});
export const useFavorites=()=>useContext(Context);
export function FavoritesProvider({children}:{children:ReactNode}) {
  const {data:session,status}=useSession();const userId=session?.user.id??null;
  const [version,setVersion]=useState(0);
  const [state,setState]=useState<State>({owner:null,ids:new Set(),loading:true,error:null});
  useEffect(()=>{
    let active=true;
    if(!userId){setState({owner:null,ids:new Set(),loading:status==='loading',error:null});return;}
    setState({owner:userId,ids:new Set(),loading:true,error:null});
    void getSupabase().from('favorites').select('temple_id').eq('user_id',userId).then(({data,error})=>{
      if(active)setState({owner:userId,ids:new Set(data?.map(row=>String(row.temple_id))??[]),loading:false,error:error?'Не удалось загрузить избранное.':null});
    });
    return()=>{active=false;};
  },[userId,status,version]);
  async function toggle(id:string) {
    if(!userId||state.owner!==userId||state.loading||state.error)throw new Error('Сначала загрузите избранное.');
    const next=!state.ids.has(id);
    const result=next?await getSupabase().from('favorites').insert({user_id:userId,temple_id:id}):await getSupabase().from('favorites').delete().eq('user_id',userId).eq('temple_id',id);
    if(result.error)throw new Error('Не удалось сохранить избранное. Попробуйте ещё раз.');
    setState(current=>{
      if(current.owner!==userId)return current;
      const ids=new Set(current.ids);if(next)ids.add(id);else ids.delete(id);return {...current,ids};
    });
  }
  return <Context.Provider value={{ids:state.owner===userId?state.ids:new Set(),loading:state.loading,error:state.error,toggle,reload:()=>setVersion(v=>v+1)}}>{children}</Context.Provider>;
}
