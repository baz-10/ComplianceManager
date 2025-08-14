import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

// MODERN HERO COMPONENTS
interface HeroSectionProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gradient' | 'minimal';
}

export function HeroSection({ children, className, variant = 'default' }: HeroSectionProps) {
  const variantClasses = {
    default: 'flightdocs-hero min-h-[80vh] flex items-center',
    gradient: 'flightdocs-gradient-primary min-h-[70vh] flex items-center text-white',
    minimal: 'bg-background min-h-[60vh] flex items-center'
  };

  return (
    <section className={cn(
      'relative overflow-hidden rounded-3xl py-24 px-8',
      variantClasses[variant],
      className
    )}>
      {variant === 'default' && (
        <>
          <div className="absolute inset-0 flightdocs-gradient-mesh opacity-60"></div>
          <div className="absolute top-10 right-10 flightdocs-animate-float opacity-20">
            <div className="w-32 h-32 rounded-full flightdocs-gradient-primary blur-xl"></div>
          </div>
        </>
      )}
      <div className="relative z-20 w-full">
        {children}
      </div>
    </section>
  );
}

// MODERN CARD COMPONENTS
interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'hero' | 'media';
  hover?: boolean;
  onClick?: () => void;
}

export function ModernCard({ 
  children, 
  className, 
  variant = 'default', 
  hover = true,
  onClick 
}: ModernCardProps) {
  const variantClasses = {
    default: 'flightdocs-card',
    glass: 'flightdocs-card-glass',
    hero: 'flightdocs-card-hero',
    media: 'flightdocs-media-card'
  };

  return (
    <div 
      className={cn(
        variantClasses[variant],
        hover && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// IMAGE-READY CARD
interface MediaCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  imagePlaceholder?: string;
  buttonText: string;
  buttonVariant?: 'primary' | 'secondary' | 'accent';
  onClick?: () => void;
  children?: React.ReactNode;
}

export function MediaCard({
  title,
  description,
  icon: Icon,
  imagePlaceholder = "Feature Preview",
  buttonText,
  buttonVariant = 'primary',
  onClick,
  children
}: MediaCardProps) {
  const buttonVariants = {
    primary: 'flightdocs-btn-primary',
    secondary: 'bg-gradient-to-r from-secondary to-accent text-white font-semibold',
    accent: 'bg-gradient-to-r from-accent to-primary text-white font-semibold'
  };

  return (
    <ModernCard variant="media" onClick={onClick}>
      {/* Image Container - Ready for Screenshots */}
      <div className="image-container">
        <div className="image-placeholder">
          <div className="text-center">
            <Icon className="h-16 w-16 text-primary/60 mx-auto mb-4" />
            <p className="text-primary/60 font-medium">{imagePlaceholder}</p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-4 rounded-2xl">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">{title}</h3>
            <p className="text-base text-muted-foreground">{description}</p>
          </div>
        </div>
        
        {children}
        
        <button 
          className={cn(
            'w-full py-4 rounded-xl hover:shadow-xl transition-all duration-300',
            buttonVariants[buttonVariant]
          )}
          onClick={onClick}
        >
          {buttonText}
        </button>
      </div>
    </ModernCard>
  );
}

// GRADIENT TEXT COMPONENT
interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'rainbow' | 'sunset';
}

export function GradientText({ children, className, variant = 'primary' }: GradientTextProps) {
  const variants = {
    primary: 'flightdocs-text-gradient',
    rainbow: 'bg-gradient-to-r from-primary via-secondary via-accent to-primary bg-clip-text text-transparent',
    sunset: 'bg-gradient-to-r from-accent via-warning to-secondary bg-clip-text text-transparent'
  };

  return (
    <span className={cn(variants[variant], className)}>
      {children}
    </span>
  );
}

// MODERN BUTTON VARIANTS
interface ModernButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'glass' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  disabled?: boolean;
}

export function ModernButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled
}: ModernButtonProps) {
  const variantClasses = {
    primary: 'flightdocs-btn-primary',
    glass: 'flightdocs-btn-glass',
    outline: 'border-2 border-primary/30 bg-background hover:bg-primary/5 text-primary font-semibold',
    ghost: 'bg-transparent hover:bg-primary/10 text-primary font-medium'
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm rounded-lg',
    md: 'px-6 py-3 text-base rounded-xl',
    lg: 'px-8 py-4 text-lg rounded-xl',
    xl: 'px-12 py-6 text-xl rounded-2xl'
  };

  return (
    <button
      className={cn(
        'font-semibold transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5',
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed hover:scale-100 hover:translate-y-0',
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// STATS SECTION
interface StatItemProps {
  icon: LucideIcon;
  value: string;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'card';
}

export function StatItem({ icon: Icon, value, label, trend, variant = 'default' }: StatItemProps) {
  const trendColors = {
    up: 'text-success',
    down: 'text-destructive',
    neutral: 'text-muted-foreground'
  };

  if (variant === 'card') {
    return (
      <ModernCard variant="glass" className="p-6 text-center group hover:scale-105 transition-all duration-500">
        <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 group-hover:from-primary/30 group-hover:to-secondary/30 transition-all duration-300 w-fit mx-auto">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <span className="text-4xl font-black flightdocs-text-gradient block mb-2">{value}</span>
        <p className="text-lg text-muted-foreground font-medium">{label}</p>
      </ModernCard>
    );
  }

  return (
    <div className="text-center">
      <div className="flex items-center justify-center mb-2">
        <Icon className="h-5 w-5 text-primary mr-2" />
        <span className={cn('text-2xl font-bold', trend && trendColors[trend])}>{value}</span>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// FEATURE GRID
interface FeatureItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick?: () => void;
}

export function FeatureItem({ icon: Icon, title, description, onClick }: FeatureItemProps) {
  return (
    <ModernCard className="group cursor-pointer h-full" onClick={onClick}>
      <div className="p-8 h-full flex flex-col">
        {/* Icon with dramatic effect */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <div className="relative bg-gradient-to-br from-primary/10 to-secondary/10 p-6 rounded-3xl w-fit group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 flightdocs-animate-pulse-glow">
            <Icon className="h-10 w-10 text-primary" />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <h3 className="text-2xl font-bold mb-4 group-hover:flightdocs-text-gradient transition-all duration-300">
            {title}
          </h3>
          <p className="text-lg text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors duration-300">
            {description}
          </p>
        </div>
        
        {/* Learn More Link */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="flex items-center text-primary font-semibold group-hover:text-accent transition-colors duration-300">
            Learn More
            <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </ModernCard>
  );
}

// SECTION HEADER
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  centered?: boolean;
}

export function SectionHeader({ title, subtitle, className, centered = true }: SectionHeaderProps) {
  return (
    <div className={cn(centered && 'text-center', 'mb-16', className)}>
      <h2 className="text-5xl md:text-6xl font-black mb-6 flightdocs-text-gradient">
        {title}
      </h2>
      {subtitle && (
        <p className="text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}