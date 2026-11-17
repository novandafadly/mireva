import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "./actions";

export async function GoogleButton({ nextPath }: { nextPath: string }) {
  const t = await getTranslations("auth");
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="lanjut" value={nextPath} />
      <Button type="submit" variant="outline" className="h-11 w-full">
        {t("google")}
      </Button>
    </form>
  );
}
