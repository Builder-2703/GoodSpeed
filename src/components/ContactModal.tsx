import { useState, useEffect } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { X } from 'lucide-react'
import type { QuoteRequest } from '../lib/types'

type ContactModalProps = {
  open: boolean
  source: 'help' | 'quote' | null
  selectionId: string | null
  onClose: () => void
  onSubmit: (quote: QuoteRequest) => void
}

export default function ContactModal({ open, source, selectionId, onClose, onSubmit }: ContactModalProps) {
  const [name, setName] = useState('')
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email')
  const [contactValue, setContactValue] = useState('')
  const [errors, setErrors] = useState<{ name?: string; contact?: string }>({})

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName('')
      setContactMethod('email')
      setContactValue('')
      setErrors({})
    }
  }, [open])

  function validate(): boolean {
    const newErrors: { name?: string; contact?: string } = {}
    if (!name.trim()) newErrors.name = 'Name is required'

    if (contactMethod === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue))
        newErrors.contact = 'Enter a valid email address'
    } else {
      if (!/^[0-9+\-\s()]+$/.test(contactValue) || contactValue.trim().length < 7)
        newErrors.contact = 'Enter a valid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit() {
    if (!validate()) return

    const quote: QuoteRequest = {
      id: crypto.randomUUID(),
      selectionId,
      name: name.trim(),
      contactMethod,
      contactValue: contactValue.trim(),
      submittedAt: Date.now(),
    }

    onSubmit(quote)
  }

  const title = source === 'help' ? 'Need help choosing?' : 'Request a Quote'
  const subtitle = source === 'help'
    ? 'Tell us about your project and we\'ll recommend the best configuration.'
    : 'We\'ll send you a detailed quote for your selected configuration.'

  return (
    <Dialog open={open} onClose={onClose} className="relative z-40">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition-opacity duration-200 data-[closed]:opacity-0"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl transition-all duration-200 data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {title}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <div className="mt-6 space-y-4">
            {/* Name field */}
            <div>
              <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700">
                Name *
              </label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#D4A843] focus:outline-none focus:ring-1 focus:ring-[#D4A843]"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Contact method radios */}
            <div>
              <p className="block text-sm font-medium text-gray-700">Preferred contact method:</p>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="contactMethod"
                    value="email"
                    checked={contactMethod === 'email'}
                    onChange={() => { setContactMethod('email'); setContactValue(''); setErrors(e => ({ ...e, contact: undefined })) }}
                    className="accent-[#D4A843]"
                  />
                  Email
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="contactMethod"
                    value="phone"
                    checked={contactMethod === 'phone'}
                    onChange={() => { setContactMethod('phone'); setContactValue(''); setErrors(e => ({ ...e, contact: undefined })) }}
                    className="accent-[#D4A843]"
                  />
                  Phone
                </label>
              </div>
            </div>

            {/* Contact value field (conditional) */}
            {contactMethod === 'email' ? (
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={contactValue}
                  onChange={e => setContactValue(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#D4A843] focus:outline-none focus:ring-1 focus:ring-[#D4A843]"
                />
                {errors.contact && (
                  <p className="mt-1 text-sm text-red-600">{errors.contact}</p>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700">
                  Phone number *
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  value={contactValue}
                  onChange={e => setContactValue(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#D4A843] focus:outline-none focus:ring-1 focus:ring-[#D4A843]"
                />
                {errors.contact && (
                  <p className="mt-1 text-sm text-red-600">{errors.contact}</p>
                )}
              </div>
            )}
          </div>

          {/* Button row */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="rounded-md bg-[#D4A843] px-4 py-2 text-sm font-medium text-white hover:bg-[#c49a3a]"
            >
              Submit
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
