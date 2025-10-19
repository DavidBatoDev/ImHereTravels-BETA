"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { EmailAvatar } from "./email-avatar";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface Contact {
  name: string;
  email: string;
  avatarUrl?: string;
}

interface EmailAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  selectedEmails?: string[];
  onSelectedEmailsChange?: (emails: string[]) => void;
}

export function EmailAutocomplete({
  value,
  onChange,
  placeholder = "Recipients",
  className,
  style,
  selectedEmails = [],
  onSelectedEmailsChange,
}: EmailAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if string is a valid email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Debounced search function
  const searchContacts = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/contacts/search?q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        const contactSuggestions = data.contacts || [];
        
        // Check if the query itself is a valid email address
        const isQueryValidEmail = isValidEmail(query.trim());
        let suggestions = contactSuggestions;
        
        if (isQueryValidEmail) {
          // Check if this email is already in contacts
          const emailExists = contactSuggestions.some(
            (contact: Contact) => contact.email.toLowerCase() === query.trim().toLowerCase()
          );
          
          if (!emailExists) {
            // Add the typed email as a suggestion
            const emailSuggestion: Contact = {
              name: query.trim(),
              email: query.trim(),
              avatarUrl: undefined, // No avatar for non-contact emails
            };
            suggestions = [emailSuggestion, ...contactSuggestions];
          }
        }
        
        setSuggestions(suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Error searching contacts:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce the search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchContacts(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value, searchContacts]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (contact: Contact) => {
    const email = contact.email;
    
    // Add to selected emails if not already selected
    if (onSelectedEmailsChange && !selectedEmails.includes(email)) {
      onSelectedEmailsChange([...selectedEmails, email]);
    }
    
    // Clear the input
    onChange("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle removing an email tag
  const handleRemoveEmail = (emailToRemove: string) => {
    if (onSelectedEmailsChange) {
      onSelectedEmailsChange(selectedEmails.filter(email => email !== emailToRemove));
    }
  };

  // Handle input key events for tags
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle backspace to remove last tag when input is empty
    if (e.key === "Backspace" && value === "" && selectedEmails.length > 0) {
      e.preventDefault();
      handleRemoveEmail(selectedEmails[selectedEmails.length - 1]);
      return;
    }

    // Handle Enter to add current input as email if it's valid
    if (e.key === "Enter" && value.trim() && isValidEmail(value.trim())) {
      e.preventDefault();
      if (onSelectedEmailsChange && !selectedEmails.includes(value.trim())) {
        onSelectedEmailsChange([...selectedEmails, value.trim()]);
        onChange("");
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
      return;
    }

    // Handle comma to add current input as email if it's valid
    if (e.key === "," && value.trim() && isValidEmail(value.trim())) {
      e.preventDefault();
      if (onSelectedEmailsChange && !selectedEmails.includes(value.trim())) {
        onSelectedEmailsChange([...selectedEmails, value.trim()]);
        onChange("");
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
      return;
    }

    // Handle other keyboard navigation
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };


  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="font-semibold bg-yellow-200">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Check if query matches name or email
  const getMatchType = (contact: Contact, query: string) => {
    const queryLower = query.toLowerCase();
    const nameMatch = contact.name.toLowerCase().includes(queryLower);
    const emailMatch = contact.email.toLowerCase().includes(queryLower);
    
    if (nameMatch && emailMatch) return "both";
    if (nameMatch) return "name";
    if (emailMatch) return "email";
    return "none";
  };

  // Check if this is a typed email (not from contacts)
  const isTypedEmail = (contact: Contact, query: string) => {
    return contact.name === query.trim() && 
           contact.email === query.trim() && 
           !contact.avatarUrl;
  };

  return (
    <div className="relative w-full">
      <div className="flex flex-wrap items-center gap-1 min-h-6 py-1">
        {/* Email Tags */}
        {selectedEmails.map((email, index) => (
          <div
            key={`${email}-${index}`}
            className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
          >
            <span className="truncate max-w-32">{email}</span>
            <button
              type="button"
              onClick={() => handleRemoveEmail(email)}
              className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        
        {/* Input Field */}
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={selectedEmails.length === 0 ? placeholder : ""}
          className={cn(
            "flex-1 border-none shadow-none focus:ring-0 px-0 bg-transparent outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 h-6 text-sm min-w-32",
            className
          )}
          style={style}
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              Searching contacts...
            </div>
          ) : (
            suggestions.map((contact, index) => (
               <div
                 key={`${contact.email}-${index}`}
                 className={cn(
                   "px-3 py-2 cursor-pointer flex items-center gap-3 hover:bg-gray-50 transition-colors",
                   selectedIndex === index && "bg-blue-50",
                   isTypedEmail(contact, value) && "bg-orange-50 border-l-2 border-orange-300"
                 )}
                 onClick={() => handleSuggestionSelect(contact)}
                 onMouseEnter={() => setSelectedIndex(index)}
               >
                <EmailAvatar
                  email={contact.email}
                  name={contact.name}
                  size="sm"
                  className="flex-shrink-0"
                />
                 <div className="flex-1 min-w-0">
                   <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                     {highlightText(contact.name, value)}
                     {isTypedEmail(contact, value) && (
                       <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                         new
                       </span>
                     )}
                     {!isTypedEmail(contact, value) && getMatchType(contact, value) === "name" && (
                       <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                         name
                       </span>
                     )}
                     {!isTypedEmail(contact, value) && getMatchType(contact, value) === "both" && (
                       <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                         both
                       </span>
                     )}
                   </div>
                   <div className="text-xs text-gray-500 truncate flex items-center gap-2">
                     {highlightText(contact.email, value)}
                     {!isTypedEmail(contact, value) && getMatchType(contact, value) === "email" && (
                       <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                         email
                       </span>
                     )}
                   </div>
                 </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
