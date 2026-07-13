import { useToast } from "@/hooks/use-toast"
import {
 Toast,
 ToastClose,
 ToastDescription,
 ToastProvider,
 ToastTitle,
 ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
 const { toasts } = useToast()

 return (
   <ToastProvider>
     {toasts.map(function ({ id, title, description, action, ...props }) {
       return (
         <Toast key={id} {...props}>
           <div className="grid gap-1">
             {title && <ToastTitle>{title}</ToastTitle>}
             {description && (
               <ToastDescription>{description}</ToastDescription>
             )}
           </div>
           {action}
           <ToastClose />
         </Toast>
       );
     })}
     <ToastViewport />
   </ToastProvider>
 );
}



"use client";
import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

const ToggleGroupContext = React.createContext({
 size: "default",
 variant: "default",
})

const ToggleGroup = React.forwardRef(({ className, variant, size, children, ...props }, ref) => (
 <ToggleGroupPrimitive.Root
   ref={ref}
   className={cn("flex items-center justify-center gap-1", className)}
   {...props}>
   <ToggleGroupContext.Provider value={{ variant, size }}>
     {children}
   </ToggleGroupContext.Provider>
 </ToggleGroupPrimitive.Root>
))

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

const ToggleGroupItem = React.forwardRef(({ className, children, variant, size, ...props }, ref) => {
 const context = React.useContext(ToggleGroupContext)

 return (
   <ToggleGroupPrimitive.Item
     ref={ref}
     className={cn(toggleVariants({
       variant: context.variant || variant,
       size: context.size || size,
     }), className)}
     {...props}>
     {children}
   </ToggleGroupPrimitive.Item>
 );
})

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem }



import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const toggleVariants = cva(
 "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
 {
   variants: {
     variant: {
       default: "bg-transparent",
       outline:
         "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
     },
     size: {
       default: "h-9 px-2 min-w-9",
       sm: "h-8 px-1.5 min-w-8",
       lg: "h-10 px-2.5 min-w-10",
     },
   },
   defaultVariants: {
     variant: "default",
     size: "default",
   },
 }
)

const Toggle = React.forwardRef(({ className, variant, size, ...props }, ref) => (
 <TogglePrimitive.Root
   ref={ref}
   className={cn(toggleVariants({ variant, size, className }))}
   {...props} />
))

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }



import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => (
 <TooltipPrimitive.Portal>
   <TooltipPrimitive.Content
     ref={ref}
     sideOffset={sideOffset}
     className={cn(
       "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-tooltip-content-transform-origin]",
       className
     )}
     {...props} />
 </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }



import React, { createContext, useContext, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import { getDeviceId } from '@/lib/deviceId';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
 const [user, setUser] = useState(pb.authStore.record);
 const [guest, setGuest] = useState(false);

 useEffect(() => {
   const unsub = pb.authStore.onChange((_t, record) => setUser(record));
   return unsub;
 }, []);

 useEffect(() => {
   // Validate the persisted session on load: if the token is stale or the
   // underlying user record no longer exists, clear it instead of letting
   // later PB calls fail with confusing 404s.
   if (pb.authStore.isValid) {
     pb.collection('users')
       .authRefresh()
       .catch(() => {
         pb.authStore.clear();
       });
   }
 }, []);

 const login = async (email, password) => {
   await pb.collection('users').authWithPassword(email, password);
   const record = pb.authStore.record;
   if (record.disabled) {
     pb.authStore.clear();
     throw new Error('Akun ini telah dinonaktifkan. Silakan hubungi admin.');
   }
   const deviceId = getDeviceId();
   const devices = Array.isArray(record.deviceIds) ? record.deviceIds : [];
   if (!devices.includes(deviceId)) {
     if (devices.length >= 2) {
       pb.authStore.clear();
       throw new Error(
         'Akun ini sudah login di 2 device lain. Hubungi admin untuk reset device.',
       );
     }
     const updated = [...devices, deviceId];
     await pb.collection('users').update(record.id, { deviceIds: updated });
   }
   setGuest(false);
   return record;
 };

 const enterGuest = () => setGuest(true);

 const logout = () => {
   pb.authStore.clear();
   setGuest(false);
 };

 const isAuthed = pb.authStore.isValid;
 const role = guest ? 'guest' : user?.role;

 return (
   <AuthContext.Provider value={{ user, guest, role, isAuthed, login, logout, enterGuest }}>
     {children}
   </AuthContext.Provider>
 );
}

export function useAuth() {
 return useContext(AuthContext);
}
