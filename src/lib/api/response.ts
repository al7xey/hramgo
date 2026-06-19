import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function accepted(message: string, data: Record<string, unknown> = {}) {
  return NextResponse.json({ message, ...data }, { status: 202 });
}

export function badRequest(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: "Проверьте заполненные поля",
        issues: error.issues
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ message: "Некорректный запрос" }, { status: 400 });
}

export function notFound(message = "Не найдено") {
  return NextResponse.json({ message }, { status: 404 });
}

export function unauthorized() {
  return NextResponse.json({ message: "Нужно войти" }, { status: 401 });
}

export function forbidden(message = "Недостаточно прав") {
  return NextResponse.json({ message }, { status: 403 });
}

export function actionQueued(message = "Действие добавлено в очередь модерации") {
  return NextResponse.json({ message }, { status: 202 });
}
