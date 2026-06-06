"use client";

import React from "react";

interface SectionWrapperProps {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SectionWrapper({
  id,
  title,
  description,
  children,
  className = "",
}: SectionWrapperProps) {
  return (
    <div
      id={`section-${id}`}
      className={`overflow-hidden rounded-[24px] bg-white shadow-medium scroll-mt-4 ${className}`}
    >
      {/* www-style section header */}
      <div className="border-b border-light-grey px-6 py-5 md:px-8">
        <h2 className="font-display text-h4-mobile font-bold text-midnight leading-snug">
          {title}
        </h2>
        {description && (
          <p className="mt-1 font-body text-b4-desktop text-dark-gray">
            {description}
          </p>
        )}
      </div>

      {/* Section content */}
      <div className="px-6 py-6 md:px-8">{children}</div>
    </div>
  );
}
