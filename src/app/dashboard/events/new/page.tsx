'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField, FormSection } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { formatUSD, cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  MapPin,
  Ticket,
  DollarSign,
  Shield,
  Check,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';

const CATEGORIES = [
  { value: 'MUSIC', label: 'Music' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'ARTS', label: 'Arts' },
  { value: 'THEATER', label: 'Theater' },
  { value: 'COMEDY', label: 'Comedy' },
  { value: 'CONFERENCE', label: 'Conference' },
  { value: 'FESTIVAL', label: 'Festival' },
  { value: 'NETWORKING', label: 'Networking' },
  { value: 'OTHER', label: 'Other' },
];

const LOCATION_TYPES = [
  { value: 'IN_PERSON', label: 'In Person' },
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'HYBRID', label: 'Hybrid' },
];

interface TicketTier {
  name: string;
  description: string;
  priceUsd: number;
  totalQuantity: number;
  maxPerWallet: number;
  perks: string[];
}

const STEPS = ['Basic Info', 'Date & Venue', 'Tickets', 'Resale Settings', 'Review'];

export default function CreateEventPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    description: '',
    shortDescription: '',
    category: 'MUSIC',
    coverImageUrl: '',

    // Date & Venue
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    doorsOpenTime: '',
    timezone: 'America/New_York',
    locationType: 'IN_PERSON',
    venueName: '',
    venueAddress: '',
    city: '',
    state: '',
    country: 'USA',
    virtualUrl: '',

    // Resale Settings
    resaleEnabled: true,
    maxResaleMarkupBps: 1500, // 15%
  });

  const [tiers, setTiers] = useState<TicketTier[]>([
    {
      name: 'General Admission',
      description: '',
      priceUsd: 50,
      totalQuantity: 100,
      maxPerWallet: 4,
      perks: [],
    },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      {
        name: '',
        description: '',
        priceUsd: 0,
        totalQuantity: 100,
        maxPerWallet: 4,
        perks: [],
      },
    ]);
  };

  const removeTier = (index: number) => {
    if (tiers.length > 1) {
      setTiers((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateTier = (index: number, field: keyof TicketTier, value: any) => {
    setTiers((prev) =>
      prev.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier))
    );
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 0) {
      if (!formData.name.trim()) newErrors.name = 'Event name is required';
      if (!formData.description.trim()) newErrors.description = 'Description is required';
      if (!formData.category) newErrors.category = 'Category is required';
    }

    if (currentStep === 1) {
      if (!formData.startDate) newErrors.startDate = 'Start date is required';
      if (!formData.startTime) newErrors.startTime = 'Start time is required';
      if (formData.locationType !== 'VIRTUAL') {
        if (!formData.venueName.trim()) newErrors.venueName = 'Venue name is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
      }
      if (formData.locationType !== 'IN_PERSON') {
        if (!formData.virtualUrl.trim()) newErrors.virtualUrl = 'Virtual URL is required';
      }
    }

    if (currentStep === 2) {
      tiers.forEach((tier, index) => {
        if (!tier.name.trim()) newErrors[`tier_${index}_name`] = 'Tier name is required';
        if (tier.priceUsd < 0) newErrors[`tier_${index}_price`] = 'Price must be 0 or more';
        if (tier.totalQuantity < 1) newErrors[`tier_${index}_quantity`] = 'Quantity must be at least 1';
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);

    try {
      // Combine date and time
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      let endDateTime = formData.endDate && formData.endTime
        ? new Date(`${formData.endDate}T${formData.endTime}`)
        : undefined;

      const payload = {
        name: formData.name,
        description: formData.description,
        shortDescription: formData.shortDescription || formData.description.slice(0, 150),
        category: formData.category,
        coverImageUrl: formData.coverImageUrl || undefined,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime?.toISOString(),
        doorsOpen: formData.doorsOpenTime
          ? new Date(`${formData.startDate}T${formData.doorsOpenTime}`).toISOString()
          : undefined,
        timezone: formData.timezone,
        locationType: formData.locationType,
        venueName: formData.venueName || undefined,
        venueAddress: formData.venueAddress || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        country: formData.country || undefined,
        virtualUrl: formData.virtualUrl || undefined,
        totalCapacity: tiers.reduce((sum, t) => sum + t.totalQuantity, 0),
        resaleEnabled: formData.resaleEnabled,
        maxResaleMarkupBps: formData.resaleEnabled ? formData.maxResaleMarkupBps : null,
        tiers: tiers.map((tier) => ({
          name: tier.name,
          description: tier.description || undefined,
          priceUsd: tier.priceUsd,
          totalQuantity: tier.totalQuantity,
          maxPerWallet: tier.maxPerWallet,
          perks: tier.perks,
        })),
      };

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        success('Event Created!', 'Your event has been created successfully.');
        router.push(`/dashboard/events/${data.id}`);
      } else {
        error('Failed to create event', data.error || 'Please try again');
      }
    } catch (err) {
      error('Failed to create event', 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCapacity = tiers.reduce((sum, t) => sum + t.totalQuantity, 0);
  const lowestPrice = Math.min(...tiers.map((t) => t.priceUsd));
  const highestPrice = Math.max(...tiers.map((t) => t.priceUsd));

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create Event</h1>
        <p className="text-gray-500 mt-1">Fill out the details to create your event</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  index < currentStep
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                )}
              >
                {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  'hidden sm:block ml-2 text-sm',
                  index === currentStep ? 'text-indigo-600 font-medium' : 'text-gray-500'
                )}
              >
                {step}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-8 sm:w-16 h-0.5 mx-2',
                    index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <Card variant="bordered" className="mb-6">
        {currentStep === 0 && (
          <FormSection title="Basic Information" description="Tell us about your event">
            <FormField label="Event Name" required error={errors.name}>
              <Input
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="e.g., Summer Music Festival 2025"
              />
            </FormField>

            <FormField label="Category" required error={errors.category}>
              <Select
                value={formData.category}
                onChange={(e) => updateFormData('category', e.target.value)}
                options={CATEGORIES}
              />
            </FormField>

            <FormField label="Short Description" hint="A brief summary for listings (max 150 chars)">
              <Input
                value={formData.shortDescription}
                onChange={(e) => updateFormData('shortDescription', e.target.value)}
                placeholder="Join us for an unforgettable night of music..."
                maxLength={150}
              />
            </FormField>

            <FormField label="Full Description" required error={errors.description}>
              <TextArea
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Describe your event in detail..."
                rows={4}
              />
            </FormField>

            <FormField label="Cover Image URL" hint="Recommended: 1200x600px">
              <Input
                value={formData.coverImageUrl}
                onChange={(e) => updateFormData('coverImageUrl', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </FormField>
          </FormSection>
        )}

        {currentStep === 1 && (
          <FormSection title="Date & Venue" description="When and where is your event?">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Start Date" required error={errors.startDate}>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateFormData('startDate', e.target.value)}
                />
              </FormField>
              <FormField label="Start Time" required error={errors.startTime}>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => updateFormData('startTime', e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="End Date">
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => updateFormData('endDate', e.target.value)}
                />
              </FormField>
              <FormField label="End Time">
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => updateFormData('endTime', e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Doors Open Time">
              <Input
                type="time"
                value={formData.doorsOpenTime}
                onChange={(e) => updateFormData('doorsOpenTime', e.target.value)}
              />
            </FormField>

            <FormField label="Location Type" required>
              <Select
                value={formData.locationType}
                onChange={(e) => updateFormData('locationType', e.target.value)}
                options={LOCATION_TYPES}
              />
            </FormField>

            {formData.locationType !== 'VIRTUAL' && (
              <>
                <FormField label="Venue Name" required error={errors.venueName}>
                  <Input
                    value={formData.venueName}
                    onChange={(e) => updateFormData('venueName', e.target.value)}
                    placeholder="e.g., Madison Square Garden"
                  />
                </FormField>

                <FormField label="Venue Address">
                  <Input
                    value={formData.venueAddress}
                    onChange={(e) => updateFormData('venueAddress', e.target.value)}
                    placeholder="123 Main Street"
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="City" required error={errors.city}>
                    <Input
                      value={formData.city}
                      onChange={(e) => updateFormData('city', e.target.value)}
                      placeholder="New York"
                    />
                  </FormField>
                  <FormField label="State">
                    <Input
                      value={formData.state}
                      onChange={(e) => updateFormData('state', e.target.value)}
                      placeholder="NY"
                    />
                  </FormField>
                </div>
              </>
            )}

            {formData.locationType !== 'IN_PERSON' && (
              <FormField label="Virtual Event URL" required error={errors.virtualUrl}>
                <Input
                  value={formData.virtualUrl}
                  onChange={(e) => updateFormData('virtualUrl', e.target.value)}
                  placeholder="https://zoom.us/j/..."
                />
              </FormField>
            )}
          </FormSection>
        )}

        {currentStep === 2 && (
          <FormSection title="Ticket Tiers" description="Define your ticket types and pricing">
            <div className="space-y-6">
              {tiers.map((tier, index) => (
                <Card key={index} variant="bordered" className="relative">
                  {tiers.length > 1 && (
                    <button
                      onClick={() => removeTier(index)}
                      className="absolute top-4 right-4 p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <h4 className="font-medium text-gray-900 mb-4">Tier {index + 1}</h4>

                  <div className="grid gap-4">
                    <FormField label="Tier Name" required error={errors[`tier_${index}_name`]}>
                      <Input
                        value={tier.name}
                        onChange={(e) => updateTier(index, 'name', e.target.value)}
                        placeholder="e.g., General Admission, VIP"
                      />
                    </FormField>

                    <FormField label="Description">
                      <Input
                        value={tier.description}
                        onChange={(e) => updateTier(index, 'description', e.target.value)}
                        placeholder="What's included in this tier"
                      />
                    </FormField>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField label="Price (USD)" required error={errors[`tier_${index}_price`]}>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.priceUsd}
                          onChange={(e) => updateTier(index, 'priceUsd', parseFloat(e.target.value) || 0)}
                        />
                      </FormField>

                      <FormField label="Quantity" required error={errors[`tier_${index}_quantity`]}>
                        <Input
                          type="number"
                          min="1"
                          value={tier.totalQuantity}
                          onChange={(e) => updateTier(index, 'totalQuantity', parseInt(e.target.value) || 1)}
                        />
                      </FormField>

                      <FormField label="Max per Person">
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={tier.maxPerWallet}
                          onChange={(e) => updateTier(index, 'maxPerWallet', parseInt(e.target.value) || 4)}
                        />
                      </FormField>
                    </div>
                  </div>
                </Card>
              ))}

              <Button variant="outline" onClick={addTier} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Another Tier
              </Button>
            </div>
          </FormSection>
        )}

        {currentStep === 3 && (
          <FormSection
            title="Resale Settings"
            description="Control how tickets can be resold on the marketplace"
          >
            <Checkbox
              checked={formData.resaleEnabled}
              onChange={(e) => updateFormData('resaleEnabled', e.target.checked)}
              label="Enable Resale"
              description="Allow ticket holders to resell their tickets on the marketplace"
            />

            {formData.resaleEnabled && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800">Price Cap Protection</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Set a maximum markup to prevent scalping and ensure fair pricing.
                    </p>

                    <FormField label="Maximum Markup Percentage" className="mt-4">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.maxResaleMarkupBps / 100}
                          onChange={(e) =>
                            updateFormData('maxResaleMarkupBps', (parseFloat(e.target.value) || 0) * 100)
                          }
                          className="w-24"
                        />
                        <span className="text-gray-500">%</span>
                      </div>
                      <p className="text-sm text-green-600 mt-2">
                        Tickets can be resold up to {formData.maxResaleMarkupBps / 100}% above face value
                      </p>
                    </FormField>
                  </div>
                </div>
              </div>
            )}
          </FormSection>
        )}

        {currentStep === 4 && (
          <FormSection title="Review" description="Review your event details before creating">
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Name</dt>
                    <dd className="font-medium">{formData.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Category</dt>
                    <dd>{CATEGORIES.find((c) => c.value === formData.category)?.label}</dd>
                  </div>
                </dl>
              </div>

              {/* Date & Venue */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Date & Venue</h4>
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Date</dt>
                    <dd>
                      {formData.startDate} at {formData.startTime}
                    </dd>
                  </div>
                  {formData.locationType !== 'VIRTUAL' && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Venue</dt>
                      <dd>
                        {formData.venueName}, {formData.city}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Tickets */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Tickets</h4>
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Total Capacity</dt>
                    <dd>{totalCapacity.toLocaleString()} tickets</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Price Range</dt>
                    <dd>
                      {formatUSD(lowestPrice)} - {formatUSD(highestPrice)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Tiers</dt>
                    <dd>{tiers.length}</dd>
                  </div>
                </dl>
              </div>

              {/* Resale */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Resale Settings</h4>
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Resale Enabled</dt>
                    <dd>{formData.resaleEnabled ? 'Yes' : 'No'}</dd>
                  </div>
                  {formData.resaleEnabled && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Max Markup</dt>
                      <dd>{formData.maxResaleMarkupBps / 100}%</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </FormSection>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={nextStep}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </Button>
        )}
      </div>
    </div>
  );
}
