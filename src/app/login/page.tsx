import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
export const metadata={title:"Вход в профиль",robots:{index:false,follow:false}};
export default function LoginPage(){return <div className="mx-auto grid max-w-md gap-5"><h1 className="text-3xl font-semibold">Вход в профиль</h1><p className="text-sm leading-6 text-muted-foreground">Сохраняйте храмы и делитесь впечатлениями о посещении.</p><Suspense fallback={<p>Загрузка формы…</p>}><LoginForm/></Suspense></div>;}
