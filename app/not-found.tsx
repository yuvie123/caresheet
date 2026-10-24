import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24">
      <h1 className="text-4xl font-bold">That page doesn&apos;t exist</h1>
      <p className="mt-3 text-xl">CareSheet has one page: add the hospital papers and get a weekly medicine plan.</p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-action px-6 py-3 text-lg font-bold text-white">
        Go to CareSheet
      </Link>
      <p className="mt-4">
        <Link href="/?example" className="text-action underline">
          Or open the finished example
        </Link>
      </p>
    </main>
  );
}
