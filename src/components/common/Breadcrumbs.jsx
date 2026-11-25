import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumbs({ items = [], customCrumbs }) {
  const list = Array.isArray(items) && items.length > 0
    ? items
    : (Array.isArray(customCrumbs) ? customCrumbs.map(c => ({ label: c.label, link: c.link || c.path })) : []);

  return (
    <nav aria-label="Breadcrumb" className="py-4 text-[11px] uppercase tracking-wider text-[#6B6B6B]">
      <ol className="flex items-center flex-wrap gap-1.5">
        <li>
          <Link to="/" className="hover:text-[#0A0A0A] transition-colors">
            Home
          </Link>
        </li>
        {list.map((item, index) => {
          const isLast = index === list.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5">
              <ChevronRight size={12} className="text-[#BDBDBD]" />
              {isLast || !item.link ? (
                <span className="text-[#0A0A0A] font-medium truncate max-w-[130px] sm:max-w-xs md:max-w-none">
                  {item.label}
                </span>
              ) : (
                <Link to={item.link} className="hover:text-[#0A0A0A] transition-colors truncate max-w-[100px] sm:max-w-none">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
