import React from "react";
import UserInput from "@/components/UserInput";

const Page = () => {
  return (
    <main className="flex h-screen w-full items-center justify-center">
      <section className="flex h-screen w-full flex-col items-center">
        <UserInput />
      </section>
    </main>
  );
};

export default Page;
