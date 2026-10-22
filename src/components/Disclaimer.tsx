export const DISCLAIMER =
  "CloudPrep AI is an independent, unofficial AZ-900 study aid. It is not affiliated with or endorsed by Microsoft. Azure and AZ-900 are referenced for educational identification purposes. Practice questions are original learning materials and are not actual Microsoft exam questions.";
export default function Footer() {
  return (
    <footer className="border-t border-slate-200 px-6 py-6 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
      <p className="mx-auto max-w-3xl text-center">{DISCLAIMER}</p>
    </footer>
  );
}
