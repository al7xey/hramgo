"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth/client";
import { useEffect, useMemo, useRef, useState } from "react";

import { getSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const exampleAmounts = [300, 700, 1500];

type Props = {
  minAmount?: number;
  maxAmount?: number;
  paymentEnabled: boolean;
};

export function SupportPaymentForm({ minAmount, maxAmount, paymentEnabled }: Props) {
  const { data: session } = useSession();
  const requestKey=useRef<{fingerprint:string;key:string}|null>(null);
  const sessionEmail = session?.user?.email ?? "";
  const defaultAmount = minAmount ?? exampleAmounts[0];
  const [amount, setAmount] = useState(String(defaultAmount));
  const [email, setEmail] = useState(sessionEmail);
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (sessionEmail) {
      setEmail(sessionEmail);
    }
  }, [sessionEmail]);

  const amountNumber = Number(amount);
  const validationMessage = useMemo(() => {
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return "Введите положительную сумму.";
    }

    if (minAmount && amountNumber < minAmount) {
      return `Минимальная сумма поддержки — ${minAmount} ₽.`;
    }

    if (maxAmount && amountNumber > maxAmount) {
      return `Максимальная сумма поддержки — ${maxAmount} ₽.`;
    }

    if (!email) {
      return "Укажите e-mail для отправки кассового чека.";
    }

    return null;
  }, [amountNumber, email, maxAmount, minAmount]);

  const disabled = pending || !session || !paymentEnabled || !consent || Boolean(validationMessage);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();

        if (disabled) return;

        setPending(true);
        setMessage(null);

        try {
          const fingerprint=JSON.stringify([amountNumber,email]);
          if(requestKey.current?.fingerprint!==fingerprint)requestKey.current={fingerprint,key:crypto.randomUUID()};
          const {data,error}=await getSupabase().functions.invoke('create-payment',{body:{amount:amountNumber,email,personalDataConsent:consent,idempotencyKey:requestKey.current.key}});
          if(error)throw error;
          if(data.confirmationUrl){
            const url=new URL(data.confirmationUrl);
            if(url.protocol!=='https:'||!['yookassa.ru','yoomoney.ru'].some(host=>url.hostname===host||url.hostname.endsWith('.'+host)))throw new Error('Invalid redirect');
            window.location.assign(url.href);return;
          }
          setMessage(data.status==='PAID'?'Платёж уже подтверждён. Спасибо за поддержку.':'Не удалось перейти к оплате. Попробуйте ещё раз.');
        } catch {setMessage('Не удалось перейти к оплате. Проверьте подключение и повторите попытку.');}
        finally {setPending(false);}

      }}
    >
      {!paymentEnabled ? (
        <div className="rounded-[20px] border border-card-border bg-muted p-3 text-sm leading-6 text-muted-foreground">
          Приём платежей временно недоступен. Попробуйте позже.
        </div>
      ) : null}

      {!session && <p className="text-sm"><Link href="/login/?callbackUrl=/support/" className="text-primary underline">Войдите в профиль</Link>, чтобы поддержать проект.</p>}
      <div className="grid gap-2">
        <p className="text-sm font-medium">Примеры сумм</p>
        <div className="grid grid-cols-3 gap-2">
          {exampleAmounts.map((item) => (
            <button
              key={item}
              type="button"
              className={`min-h-11 rounded-[18px] border px-3 text-sm font-semibold transition ${
                Number(amount) === item ? "border-primary bg-primary-soft text-primary" : "border-card-border bg-background"
              }`}
              onClick={() => setAmount(String(item))}
            >
              {item} ₽
            </button>
          ))}
        </div>
      </div>

      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Своя сумма</span>
        <input
          type="number"
          inputMode="decimal"
          min={minAmount}
          max={maxAmount}
          step="1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="h-12 rounded-2xl border border-card-border bg-background px-3 outline-none focus:border-primary"
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">E-mail для отправки кассового чека</span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 rounded-2xl border border-card-border bg-background px-3 outline-none focus:border-primary"
        />
        <span className="text-xs leading-5 text-muted-foreground">
          Используется только для платежа и направления чека, не для рекламных рассылок.
        </span>
      </label>

      <label className="flex items-start gap-3 rounded-[20px] bg-muted p-3 text-sm leading-6">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 size-4 shrink-0 accent-primary"
        />
        <span>
          Нажимая кнопку, вы соглашаетесь с{" "}
          <Link href="/legal/support-terms" className="font-medium text-primary">
            условиями добровольной поддержки
          </Link>{" "}
          и{" "}
          <Link href="/legal/privacy" className="font-medium text-primary">
            политикой обработки персональных данных
          </Link>
          .
        </span>
      </label>

      {validationMessage ? <p className="text-sm text-danger">{validationMessage}</p> : null}

      <Button type="submit" size="lg" className="w-full" disabled={disabled}>
        {pending ? "Переходим к оплате" : "Поддержать проект"}
      </Button>

      <p className="text-xs leading-5 text-muted-foreground">
        Если включён VPN, платёжная страница или подтверждение банка могут открываться нестабильно.
      </p>

      {message ? <p className="text-sm text-danger">{message}</p> : null}
    </form>
  );
}
