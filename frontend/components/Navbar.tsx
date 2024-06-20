import Image from "next/image";
import Link from "next/link";
import React from "react";

const Navbar = () => {
  return (
    <nav className="flex h-16 items-center justify-between border-b-2 bg-transparent px-5">
      <Image src="/logo.png" alt="Logo" width={80} height={80} />

      <div>
        <Link
          href="/deploy"
          className="text-gray-500 transition-colors
        duration-200 hover:text-black
        "
        >
          Deploy
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
