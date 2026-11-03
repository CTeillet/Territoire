import React from "react";

interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6 md:mb-10">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">{title}</h1>
        <p className="text-gray-500 md:text-lg">{description}</p>
      </div>
    </div>
  );
}
