import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { Link, usePage, useForm, Head, router, createInertiaApp } from "@inertiajs/react";
import { LoaderCircle, Check, TrendingUp, TrendingDown, ChevronRight, Circle, X, PanelLeft, ChevronsUpDown, Languages, LogOut, LayoutGrid, Building2, Megaphone, ShieldCheck, Sun, Moon, Monitor, Users, UserPlus, ChevronDown, ChevronUp, Settings, Plus, Target, FolderKanban, ListChecks, GitBranch, Inbox, Plug, Sparkles, ShieldAlert, Trash2, ArrowRightLeft, Tag, Bell, ListTodo, MessageSquare, CircleCheckBig, Hourglass, Play, HelpCircle, Copy, Pencil, Star, Lock, Activity, Paperclip, Download, FileText, Phone, Globe, UserCheck, Loader2, Mail, User, DollarSign, RefreshCw, Kanban, List, XCircle, Clock, CheckCircle2, CircleDollarSign, Info, AlertTriangle, Landmark, Contact, PhoneMissed, Video, Ban, Clock3, CheckCheck, Reply, SmilePlus, MessageCircle, StickyNote, Send, Pin, UserMinus, GripVertical, Edit, Calendar, CalendarDays, Square, MoreHorizontal, FolderTree, MessagesSquare, Zap, ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as React from "react";
import { useId, useState, useEffect, Fragment as Fragment$1, useCallback, useMemo, useRef, useLayoutEffect, memo } from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { Handle, Position, ReactFlowProvider, useReactFlow, useNodesState, useEdgesState, addEdge, ReactFlow, Background, Controls } from "@xyflow/react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { formatDistanceToNow } from "date-fns";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { Transition } from "@headlessui/react";
import createServer from "@inertiajs/react/server";
import ReactDOMServer from "react-dom/server";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
function InputError({ message, className = "", ...props }) {
  return message ? /* @__PURE__ */ jsx("p", { ...props, className: cn("text-destructive text-sm", className), children: message }) : null;
}
function TextLink({ className = "", children, ...props }) {
  return /* @__PURE__ */ jsx(
    Link,
    {
      className: cn(
        "text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500",
        className
      ),
      ...props,
      children
    }
  );
}
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsx(Comp, { className: cn(buttonVariants({ variant, size, className })), ref, ...props });
});
Button.displayName = "Button";
const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return /* @__PURE__ */ jsx(
    "input",
    {
      type,
      className: cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      ),
      ref,
      ...props
    }
  );
});
Input.displayName = "Input";
const labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");
const Label = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(LabelPrimitive.Root, { ref, className: cn(labelVariants(), className), ...props }));
Label.displayName = LabelPrimitive.Root.displayName;
function AppLogoIcon(props) {
  return /* @__PURE__ */ jsx("svg", { ...props, viewBox: "0 0 40 42", xmlns: "http://www.w3.org/2000/svg", children: /* @__PURE__ */ jsx(
    "path",
    {
      fillRule: "evenodd",
      clipRule: "evenodd",
      d: "M17.2 5.63325L8.6 0.855469L0 5.63325V32.1434L16.2 41.1434L32.4 32.1434V23.699L40 19.4767V9.85547L31.4 5.07769L22.8 9.85547V18.2999L17.2 21.411V5.63325ZM38 18.2999L32.4 21.411V15.2545L38 12.1434V18.2999ZM36.9409 10.4439L31.4 13.5221L25.8591 10.4439L31.4 7.36561L36.9409 10.4439ZM24.8 18.2999V12.1434L30.4 15.2545V21.411L24.8 18.2999ZM23.8 20.0323L29.3409 23.1105L16.2 30.411L10.6591 27.3328L23.8 20.0323ZM7.6 27.9212L15.2 32.1434V38.2999L2 30.9666V7.92116L7.6 11.0323V27.9212ZM8.6 9.29991L3.05913 6.22165L8.6 3.14339L14.1409 6.22165L8.6 9.29991ZM30.4 24.8101L17.2 32.1434V38.2999L30.4 30.9666V24.8101ZM9.6 11.0323L15.2 7.92117V22.5221L9.6 25.6333V11.0323Z"
    }
  ) });
}
function AuthBrandPanel() {
  const { name, quote } = usePage().props;
  return /* @__PURE__ */ jsxs("div", { className: "bg-primary text-primary-foreground relative hidden flex-col justify-between overflow-hidden p-10 md:flex", children: [
    /* @__PURE__ */ jsx("div", { "aria-hidden": true, className: "pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-blue-950/40" }),
    /* @__PURE__ */ jsx("div", { "aria-hidden": true, className: "pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-3xl" }),
    /* @__PURE__ */ jsxs(Link, { href: route("home"), className: "relative flex items-center gap-2 text-lg font-medium", children: [
      /* @__PURE__ */ jsx(AppLogoIcon, { className: "size-8 fill-current text-white" }),
      name
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative flex flex-col gap-6", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-2xl leading-snug font-semibold tracking-tight text-balance", children: "Every customer, deal, and follow-up in one place." }),
      quote && /* @__PURE__ */ jsxs("blockquote", { className: "border-l-2 border-white/30 pl-4", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-primary-foreground/90 leading-relaxed text-balance", children: [
          "“",
          quote.message,
          "”"
        ] }),
        /* @__PURE__ */ jsx("footer", { className: "text-primary-foreground/60 mt-2 text-sm", children: quote.author })
      ] })
    ] })
  ] });
}
const Card = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("rounded-lg border bg-card text-card-foreground shadow-sm", className), ...props }));
Card.displayName = "Card";
const CardHeader = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("flex flex-col space-y-1.5 p-6", className), ...props }));
CardHeader.displayName = "CardHeader";
const CardTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("text-2xl font-semibold leading-none tracking-tight", className), ...props }));
CardTitle.displayName = "CardTitle";
const CardDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("text-sm text-muted-foreground", className), ...props }));
CardDescription.displayName = "CardDescription";
const CardContent = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("p-6 pt-0", className), ...props }));
CardContent.displayName = "CardContent";
const CardFooter = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("flex items-center p-6 pt-0", className), ...props }));
CardFooter.displayName = "CardFooter";
function AuthSplitCardLayout({ children, title, description }) {
  return /* @__PURE__ */ jsx("div", { className: "bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10", children: /* @__PURE__ */ jsx("div", { className: "w-full max-w-sm md:max-w-4xl", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-6", children: [
    /* @__PURE__ */ jsx(Card, { className: "overflow-hidden p-0 shadow-sm", children: /* @__PURE__ */ jsxs(CardContent, { className: "grid p-0 md:grid-cols-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-6 p-6 md:p-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-2 text-center", children: [
          /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold tracking-tight", children: title }),
          description && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-balance", children: description })
        ] }),
        children
      ] }),
      /* @__PURE__ */ jsx(AuthBrandPanel, {})
    ] }) }),
    /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground px-6 text-center text-xs text-balance", children: [
      "By continuing you agree to our",
      " ",
      /* @__PURE__ */ jsx("a", { href: "#", className: "hover:text-primary underline underline-offset-4", children: "Terms of Service" }),
      " ",
      "and",
      " ",
      /* @__PURE__ */ jsx("a", { href: "#", className: "hover:text-primary underline underline-offset-4", children: "Privacy Policy" }),
      "."
    ] })
  ] }) }) });
}
function AuthLayout({ children, title, description, ...props }) {
  return /* @__PURE__ */ jsx(AuthSplitCardLayout, { title, description, ...props, children });
}
function AdminForgotPassword({ status }) {
  const { data, setData, post, processing, errors } = useForm({ email: "" });
  const submit = (e) => {
    e.preventDefault();
    post(route("admin.password.email"));
  };
  return /* @__PURE__ */ jsxs(AuthLayout, { title: "Forgot password", description: "Enter your admin email to receive a password reset link", children: [
    /* @__PURE__ */ jsx(Head, { title: "Admin forgot password" }),
    status && /* @__PURE__ */ jsx("div", { className: "text-success mb-4 text-center text-sm font-medium", children: status }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxs("form", { onSubmit: submit, children: [
        /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "Email address" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "email",
              type: "email",
              name: "email",
              autoComplete: "off",
              value: data.email,
              autoFocus: true,
              onChange: (e) => setData("email", e.target.value),
              placeholder: "email@example.com"
            }
          ),
          /* @__PURE__ */ jsx(InputError, { message: errors.email })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "my-6 flex items-center justify-start", children: /* @__PURE__ */ jsxs(Button, { className: "w-full", disabled: processing, children: [
          processing && /* @__PURE__ */ jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }),
          "Email password reset link"
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "text-muted-foreground space-x-1 text-center text-sm", children: [
        /* @__PURE__ */ jsx("span", { children: "Or, return to" }),
        /* @__PURE__ */ jsx(TextLink, { href: route("admin.login"), children: "log in" })
      ] })
    ] })
  ] });
}
const __vite_glob_0_0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminForgotPassword
}, Symbol.toStringTag, { value: "Module" }));
const Checkbox = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(
    CheckboxPrimitive.Root,
    {
      ref,
      className: cn(
        "peer size-5 shrink-0 rounded-sm border border-input ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-accent-foreground",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsx(CheckboxPrimitive.Indicator, { className: cn("flex items-center justify-center text-current"), children: /* @__PURE__ */ jsx(Check, { className: "size-3.5 stroke-[3]" }) })
    }
  )
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
function AdminLogin({ status, canResetPassword }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    email: "",
    password: "",
    remember: false
  });
  const submit = (e) => {
    e.preventDefault();
    post(route("admin.login"), {
      onFinish: () => reset("password")
    });
  };
  return /* @__PURE__ */ jsxs(AuthLayout, { title: "Admin login", description: "Enter your admin credentials to access the platform", children: [
    /* @__PURE__ */ jsx(Head, { title: "Admin Login" }),
    /* @__PURE__ */ jsx("form", { className: "flex flex-col gap-6", onSubmit: submit, children: /* @__PURE__ */ jsxs("div", { className: "grid gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "Email address" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "email",
            type: "email",
            required: true,
            autoFocus: true,
            tabIndex: 1,
            autoComplete: "email",
            value: data.email,
            onChange: (e) => setData("email", e.target.value),
            placeholder: "email@example.com"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { message: errors.email })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "password", children: "Password" }),
          canResetPassword && /* @__PURE__ */ jsx("a", { href: route("admin.password.request"), className: "ml-auto text-sm underline-offset-4 hover:underline", tabIndex: 5, children: "Forgot password?" })
        ] }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "password",
            type: "password",
            required: true,
            tabIndex: 2,
            autoComplete: "current-password",
            value: data.password,
            onChange: (e) => setData("password", e.target.value),
            placeholder: "Password"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { message: errors.password })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-3", children: [
        /* @__PURE__ */ jsx(
          Checkbox,
          {
            id: "remember",
            name: "remember",
            tabIndex: 3,
            checked: data.remember,
            onCheckedChange: (checked) => setData("remember", !!checked)
          }
        ),
        /* @__PURE__ */ jsx(Label, { htmlFor: "remember", children: "Remember me" })
      ] }),
      /* @__PURE__ */ jsxs(Button, { type: "submit", className: "mt-4 w-full", tabIndex: 4, disabled: processing, children: [
        processing && /* @__PURE__ */ jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }),
        "Log in"
      ] })
    ] }) }),
    status && /* @__PURE__ */ jsx("div", { className: "text-success mb-4 text-center text-sm font-medium", children: status })
  ] });
}
const __vite_glob_0_1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminLogin
}, Symbol.toStringTag, { value: "Module" }));
function AdminResetPassword({ token, email }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    token,
    email,
    password: "",
    password_confirmation: ""
  });
  const submit = (e) => {
    e.preventDefault();
    post(route("admin.password.store"), {
      onFinish: () => reset("password", "password_confirmation")
    });
  };
  return /* @__PURE__ */ jsxs(AuthLayout, { title: "Reset password", description: "Please enter your new password below", children: [
    /* @__PURE__ */ jsx(Head, { title: "Admin reset password" }),
    /* @__PURE__ */ jsx("form", { onSubmit: submit, children: /* @__PURE__ */ jsxs("div", { className: "grid gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "Email" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "email",
            type: "email",
            name: "email",
            autoComplete: "email",
            value: data.email,
            className: "mt-1 block w-full",
            readOnly: true,
            onChange: (e) => setData("email", e.target.value)
          }
        ),
        /* @__PURE__ */ jsx(InputError, { message: errors.email, className: "mt-2" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "password", children: "Password" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "password",
            type: "password",
            name: "password",
            autoComplete: "new-password",
            value: data.password,
            className: "mt-1 block w-full",
            autoFocus: true,
            onChange: (e) => setData("password", e.target.value),
            placeholder: "Password"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { message: errors.password })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "password_confirmation", children: "Confirm password" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "password_confirmation",
            type: "password",
            name: "password_confirmation",
            autoComplete: "new-password",
            value: data.password_confirmation,
            className: "mt-1 block w-full",
            onChange: (e) => setData("password_confirmation", e.target.value),
            placeholder: "Confirm password"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { message: errors.password_confirmation, className: "mt-2" })
      ] }),
      /* @__PURE__ */ jsxs(Button, { type: "submit", className: "mt-4 w-full", disabled: processing, children: [
        processing && /* @__PURE__ */ jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }),
        "Reset password"
      ] })
    ] }) })
  ] });
}
const __vite_glob_0_2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminResetPassword
}, Symbol.toStringTag, { value: "Module" }));
function PageHeader({ title, description, actions }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: title }),
      description && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: description })
    ] }),
    actions && /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: actions })
  ] });
}
function Sparkline({ values }) {
  const gradientId = `stat-spark-${useId().replace(/:/g, "")}`;
  const width = 120;
  const height = 36;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((value, index) => [index * step, height - (value - min) / span * height]);
  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return /* @__PURE__ */ jsxs("svg", { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: "none", className: "h-9 w-full", "aria-hidden": true, children: [
    /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: gradientId, x1: "0", y1: "0", x2: "0", y2: "1", children: [
      /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "var(--chart-1)", stopOpacity: "0.22" }),
      /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "var(--chart-1)", stopOpacity: "0" })
    ] }) }),
    /* @__PURE__ */ jsx("path", { d: area, fill: `url(#${gradientId})` }),
    /* @__PURE__ */ jsx("path", { d: line, fill: "none", stroke: "var(--chart-1)", strokeWidth: "2", vectorEffect: "non-scaling-stroke" })
  ] });
}
function StatCard({ label, value, icon: Icon, delta, deltaLabel, series: series2 }) {
  const up = (delta ?? 0) >= 0;
  const Trend = up ? TrendingUp : TrendingDown;
  return /* @__PURE__ */ jsxs(Card, { className: "flex flex-col gap-3 p-5", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-sm font-medium", children: label }),
      Icon && /* @__PURE__ */ jsx(Icon, { className: "text-muted-foreground size-4", "aria-hidden": true })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between gap-2", children: [
      /* @__PURE__ */ jsx("span", { className: "text-3xl font-semibold tracking-tight tabular-nums", children: value }),
      delta != null && /* @__PURE__ */ jsxs(
        "span",
        {
          className: cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
            up ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
          ),
          children: [
            /* @__PURE__ */ jsx(Trend, { className: "size-3.5", "aria-hidden": true }),
            up ? "+" : "",
            delta,
            "%"
          ]
        }
      )
    ] }),
    series2 && series2.length > 1 && /* @__PURE__ */ jsx(Sparkline, { values: series2 }),
    deltaLabel && /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs", children: deltaLabel })
  ] });
}
const Avatar = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(AvatarPrimitive.Root, { ref, className: cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className), ...props })
);
Avatar.displayName = AvatarPrimitive.Root.displayName;
const AvatarImage = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(AvatarPrimitive.Image, { ref, className: cn("aspect-square h-full w-full", className), ...props })
);
AvatarImage.displayName = AvatarPrimitive.Image.displayName;
const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  AvatarPrimitive.Fallback,
  {
    ref,
    className: cn("flex h-full w-full items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground", className),
    ...props
  }
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;
const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuSubTrigger = React.forwardRef(({ className, inset, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  DropdownMenuPrimitive.SubTrigger,
  {
    ref,
    className: cn(
      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    ),
    ...props,
    children: [
      children,
      /* @__PURE__ */ jsx(ChevronRight, { className: "ml-auto" })
    ]
  }
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;
const DropdownMenuSubContent = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.SubContent,
  {
    ref,
    className: cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    ),
    ...props
  }
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;
const DropdownMenuContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(DropdownMenuPrimitive.Portal, { children: /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Content,
  {
    ref,
    sideOffset,
    className: cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    ),
    ...props
  }
) }));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;
const DropdownMenuItem = React.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Item,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    ),
    ...props
  }
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;
const DropdownMenuCheckboxItem = React.forwardRef(({ className, children, checked, ...props }, ref) => /* @__PURE__ */ jsxs(
  DropdownMenuPrimitive.CheckboxItem,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
      className
    ),
    checked,
    ...props,
    children: [
      /* @__PURE__ */ jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsx(DropdownMenuPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) }) }),
      children
    ]
  }
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;
const DropdownMenuRadioItem = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  DropdownMenuPrimitive.RadioItem,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
      className
    ),
    ...props,
    children: [
      /* @__PURE__ */ jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsx(DropdownMenuPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Circle, { className: "h-2 w-2 fill-current" }) }) }),
      children
    ]
  }
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;
const DropdownMenuLabel = React.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ jsx(DropdownMenuPrimitive.Label, { ref, className: cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className), ...props }));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;
const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(DropdownMenuPrimitive.Separator, { ref, className: cn("-mx-1 my-1 h-px bg-muted", className), ...props }));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;
const Separator = React.forwardRef(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => /* @__PURE__ */ jsx(
    SeparatorPrimitive.Root,
    {
      ref,
      decorative,
      orientation,
      className: cn("shrink-0 bg-border", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className),
      ...props
    }
  )
);
Separator.displayName = SeparatorPrimitive.Root.displayName;
const Sheet = SheetPrimitive.Root;
const SheetPortal = SheetPrimitive.Portal;
const SheetOverlay = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(
    SheetPrimitive.Overlay,
    {
      className: cn(
        "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      ),
      ...props,
      ref
    }
  )
);
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;
const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
      }
    },
    defaultVariants: {
      side: "right"
    }
  }
);
const SheetContent = React.forwardRef(
  ({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SheetPortal, { children: [
    /* @__PURE__ */ jsx(SheetOverlay, {}),
    /* @__PURE__ */ jsxs(SheetPrimitive.Content, { ref, className: cn(sheetVariants({ side }), className), ...props, children: [
      children,
      /* @__PURE__ */ jsxs(SheetPrimitive.Close, { className: "absolute right-6 top-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary", children: [
        /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }),
        /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close" })
      ] })
    ] })
  ] })
);
SheetContent.displayName = SheetPrimitive.Content.displayName;
const SheetTitle = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(SheetPrimitive.Title, { ref, className: cn("text-lg font-semibold text-foreground", className), ...props })
);
SheetTitle.displayName = SheetPrimitive.Title.displayName;
const SheetDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SheetPrimitive.Description, { ref, className: cn("text-sm text-muted-foreground", className), ...props }));
SheetDescription.displayName = SheetPrimitive.Description.displayName;
function Skeleton({ className, ...props }) {
  return /* @__PURE__ */ jsx("div", { className: cn("animate-pulse rounded-md bg-muted", className), ...props });
}
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(
  TooltipPrimitive.Content,
  {
    ref,
    sideOffset,
    className: cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    ),
    ...props
  }
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
const MOBILE_BREAKPOINT = 768;
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(void 0);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return !!isMobile;
}
const SIDEBAR_COOKIE_NAME = "sidebar:state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
const SidebarContext = React.createContext(null);
function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}
const SidebarProvider = React.forwardRef(({ defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props }, ref) => {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open]
  );
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open2) => !open2) : setOpen((open2) => !open2);
  }, [isMobile, setOpen, setOpenMobile]);
  React.useEffect(() => {
    const handleMobileNavigation = () => {
      if (isMobile) {
        setOpenMobile(false);
      }
    };
    window.addEventListener("mobile-navigation", handleMobileNavigation);
    return () => window.removeEventListener("mobile-navigation", handleMobileNavigation);
  }, [isMobile, setOpenMobile]);
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);
  const state = open ? "expanded" : "collapsed";
  const contextValue = React.useMemo(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  );
  return /* @__PURE__ */ jsx(SidebarContext.Provider, { value: contextValue, children: /* @__PURE__ */ jsx(TooltipProvider, { delayDuration: 0, children: /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        "--sidebar-width": SIDEBAR_WIDTH,
        "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
        ...style
      },
      className: cn("group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar", className),
      ref,
      ...props,
      children
    }
  ) }) });
});
SidebarProvider.displayName = "SidebarProvider";
const Sidebar = React.forwardRef(({ side = "left", variant = "sidebar", collapsible = "offcanvas", className, children, ...props }, ref) => {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
  if (collapsible === "none") {
    return /* @__PURE__ */ jsx("div", { className: cn("flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground", className), ref, ...props, children });
  }
  if (isMobile) {
    return /* @__PURE__ */ jsx(Sheet, { open: openMobile, onOpenChange: setOpenMobile, ...props, children: /* @__PURE__ */ jsxs(
      SheetContent,
      {
        "data-sidebar": "sidebar",
        "data-mobile": "true",
        className: "w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden",
        style: {
          "--sidebar-width": SIDEBAR_WIDTH_MOBILE
        },
        side,
        children: [
          /* @__PURE__ */ jsx(SheetTitle, { className: "sr-only", children: "Sidebar Navigation" }),
          /* @__PURE__ */ jsx("div", { className: "flex h-full w-full flex-col", children })
        ]
      }
    ) });
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref,
      className: "group peer hidden text-sidebar-foreground md:block",
      "data-state": state,
      "data-collapsible": state === "collapsed" ? collapsible : "",
      "data-variant": variant,
      "data-side": side,
      children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: cn(
              "relative h-svh w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
              "group-data-[collapsible=offcanvas]:w-0",
              "group-data-[side=right]:rotate-180",
              variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
            )
          }
        ),
        /* @__PURE__ */ jsx(
          "div",
          {
            className: cn(
              "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
              side === "left" ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]" : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
              // Adjust the padding for floating and inset variants.
              variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
              className
            ),
            ...props,
            children: /* @__PURE__ */ jsx(
              "div",
              {
                "data-sidebar": "sidebar",
                className: "flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow-sm",
                children
              }
            )
          }
        )
      ]
    }
  );
});
Sidebar.displayName = "Sidebar";
const SidebarTrigger = React.forwardRef(
  ({ className, onClick, ...props }, ref) => {
    const { toggleSidebar } = useSidebar();
    return /* @__PURE__ */ jsxs(
      Button,
      {
        ref,
        "data-sidebar": "trigger",
        variant: "ghost",
        size: "icon",
        className: cn("h-7 w-7", className),
        onClick: (event) => {
          onClick == null ? void 0 : onClick(event);
          toggleSidebar();
        },
        ...props,
        children: [
          /* @__PURE__ */ jsx(PanelLeft, {}),
          /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Toggle Sidebar" })
        ]
      }
    );
  }
);
SidebarTrigger.displayName = "SidebarTrigger";
const SidebarRail = React.forwardRef(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();
  return /* @__PURE__ */ jsx(
    "button",
    {
      ref,
      "data-sidebar": "rail",
      "aria-label": "Toggle Sidebar",
      tabIndex: -1,
      onClick: toggleSidebar,
      title: "Toggle Sidebar",
      className: cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      ),
      ...props
    }
  );
});
SidebarRail.displayName = "SidebarRail";
const SidebarInset = React.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ jsx(
    "main",
    {
      ref,
      className: cn(
        "relative flex min-h-svh flex-1 flex-col bg-background",
        "peer-data-[variant=inset]:min-h-[calc(100svh-(--spacing(4)))] md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-shell md:peer-data-[variant=inset]:shadow-lg",
        className
      ),
      ...props
    }
  );
});
SidebarInset.displayName = "SidebarInset";
const SidebarInput = React.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ jsx(
    Input,
    {
      ref,
      "data-sidebar": "input",
      className: cn("h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring", className),
      ...props
    }
  );
});
SidebarInput.displayName = "SidebarInput";
const SidebarHeader = React.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ jsx("div", { ref, "data-sidebar": "header", className: cn("flex flex-col gap-3 p-3", className), ...props });
});
SidebarHeader.displayName = "SidebarHeader";
const SidebarFooter = React.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ jsx("div", { ref, "data-sidebar": "footer", className: cn("flex flex-col gap-3 p-3", className), ...props });
});
SidebarFooter.displayName = "SidebarFooter";
const SidebarSeparator = React.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsx(Separator, { ref, "data-sidebar": "separator", className: cn("mx-2 w-auto bg-sidebar-border", className), ...props });
  }
);
SidebarSeparator.displayName = "SidebarSeparator";
const SidebarContent = React.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref,
      "data-sidebar": "content",
      className: cn("flex min-h-0 flex-1 flex-col gap-3 overflow-auto group-data-[collapsible=icon]:overflow-hidden", className),
      ...props
    }
  );
});
SidebarContent.displayName = "SidebarContent";
const SidebarGroup = React.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ jsx("div", { ref, "data-sidebar": "group", className: cn("relative flex w-full min-w-0 flex-col p-3", className), ...props });
});
SidebarGroup.displayName = "SidebarGroup";
const SidebarGroupLabel = React.forwardRef(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return /* @__PURE__ */ jsx(
      Comp,
      {
        ref,
        "data-sidebar": "group-label",
        className: cn(
          "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-hidden ring-sidebar-ring transition-[margin,opa] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
          "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
          className
        ),
        ...props
      }
    );
  }
);
SidebarGroupLabel.displayName = "SidebarGroupLabel";
const SidebarGroupAction = React.forwardRef(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ jsx(
      Comp,
      {
        ref,
        "data-sidebar": "group-action",
        className: cn(
          "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
          // Increases the hit area of the button on mobile.
          "after:absolute after:-inset-2 md:after:hidden",
          "group-data-[collapsible=icon]:hidden",
          className
        ),
        ...props
      }
    );
  }
);
SidebarGroupAction.displayName = "SidebarGroupAction";
const SidebarGroupContent = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, "data-sidebar": "group-content", className: cn("w-full text-sm", className), ...props }));
SidebarGroupContent.displayName = "SidebarGroupContent";
const SidebarMenu = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("ul", { ref, "data-sidebar": "menu", className: cn("flex w-full min-w-0 flex-col gap-1", className), ...props }));
SidebarMenu.displayName = "SidebarMenu";
const SidebarMenuItem = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("li", { ref, "data-sidebar": "menu-item", className: cn("group/menu-item relative", className), ...props }));
SidebarMenuItem.displayName = "SidebarMenuItem";
const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:shadow-sm data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline: "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]"
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const SidebarMenuButton = React.forwardRef(({ asChild = false, isActive = false, variant = "default", size = "default", tooltip, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  const { isMobile, state } = useSidebar();
  const button = /* @__PURE__ */ jsx(
    Comp,
    {
      ref,
      "data-sidebar": "menu-button",
      "data-size": size,
      "data-active": isActive,
      className: cn(sidebarMenuButtonVariants({ variant, size }), className),
      ...props
    }
  );
  if (!tooltip) {
    return button;
  }
  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip
    };
  }
  return /* @__PURE__ */ jsxs(Tooltip, { children: [
    /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: button }),
    /* @__PURE__ */ jsx(TooltipContent, { side: "right", align: "center", hidden: state !== "collapsed" || isMobile, ...tooltip })
  ] });
});
SidebarMenuButton.displayName = "SidebarMenuButton";
const SidebarMenuAction = React.forwardRef(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      ref,
      "data-sidebar": "menu-action",
      className: cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 md:after:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover && "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      ),
      ...props
    }
  );
});
SidebarMenuAction.displayName = "SidebarMenuAction";
const SidebarMenuBadge = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    "data-sidebar": "menu-badge",
    className: cn(
      "pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground",
      "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
      "peer-data-[size=sm]/menu-button:top-1",
      "peer-data-[size=default]/menu-button:top-1.5",
      "peer-data-[size=lg]/menu-button:top-2.5",
      "group-data-[collapsible=icon]:hidden",
      className
    ),
    ...props
  }
));
SidebarMenuBadge.displayName = "SidebarMenuBadge";
const SidebarMenuSkeleton = React.forwardRef(({ className, showIcon = false, ...props }, ref) => {
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, []);
  return /* @__PURE__ */ jsxs("div", { ref, "data-sidebar": "menu-skeleton", className: cn("flex h-8 items-center gap-2 rounded-md px-2", className), ...props, children: [
    showIcon && /* @__PURE__ */ jsx(Skeleton, { className: "size-4 rounded-md", "data-sidebar": "menu-skeleton-icon" }),
    /* @__PURE__ */ jsx(
      Skeleton,
      {
        className: "h-4 max-w-(--skeleton-width) flex-1",
        "data-sidebar": "menu-skeleton-text",
        style: {
          "--skeleton-width": width
        }
      }
    )
  ] });
});
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";
const SidebarMenuSub = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "ul",
  {
    ref,
    "data-sidebar": "menu-sub",
    className: cn(
      "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
      "group-data-[collapsible=icon]:hidden",
      className
    ),
    ...props
  }
));
SidebarMenuSub.displayName = "SidebarMenuSub";
const SidebarMenuSubItem = React.forwardRef(({ ...props }, ref) => /* @__PURE__ */ jsx("li", { ref, ...props }));
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";
const SidebarMenuSubButton = React.forwardRef(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      ref,
      "data-sidebar": "menu-sub-button",
      "data-size": size,
      "data-active": isActive,
      className: cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-hidden ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className
      ),
      ...props
    }
  );
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";
function useInitials() {
  const getInitials = (fullName) => {
    const names = fullName.trim().split(" ");
    if (names.length === 0) return "";
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
  };
  return getInitials;
}
function lookup(messages, key) {
  return key.split(".").reduce((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return acc[part];
    }
    return void 0;
  }, messages);
}
function useTranslator() {
  const { i18n } = usePage().props;
  return (key, params = {}) => {
    const value = lookup(i18n, key);
    if (typeof value !== "string") {
      return key;
    }
    return Object.entries(params).reduce((str, [name, val]) => str.replaceAll(`:${name}`, String(val)), value);
  };
}
const LOCALES$2 = ["vi", "en"];
function AdminNavUser() {
  const { state, isMobile } = useSidebar();
  const getInitials = useInitials();
  const t = useTranslator();
  const { auth, locale } = usePage().props;
  const admin = auth.admin;
  if (!admin) {
    return null;
  }
  const setLocale = (next) => {
    if (next !== locale) {
      router.put(route("locale"), { locale: next }, { preserveScroll: true });
    }
  };
  return /* @__PURE__ */ jsx(SidebarMenu, { children: /* @__PURE__ */ jsx(SidebarMenuItem, { children: /* @__PURE__ */ jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(SidebarMenuButton, { size: "lg", className: "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground", children: [
      /* @__PURE__ */ jsx(Avatar, { className: "h-8 w-8 overflow-hidden rounded-full", children: /* @__PURE__ */ jsx(AvatarFallback, { className: "bg-secondary text-foreground rounded-lg", children: getInitials(admin.name) }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid flex-1 text-left text-sm leading-tight", children: [
        /* @__PURE__ */ jsx("span", { className: "truncate font-medium", children: admin.name }),
        /* @__PURE__ */ jsx("span", { className: "text-muted-foreground truncate text-xs", children: admin.email })
      ] }),
      /* @__PURE__ */ jsx(ChevronsUpDown, { className: "ml-auto size-4" })
    ] }) }),
    /* @__PURE__ */ jsxs(
      DropdownMenuContent,
      {
        className: "w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg",
        align: "end",
        side: isMobile ? "bottom" : state === "collapsed" ? "left" : "bottom",
        children: [
          /* @__PURE__ */ jsx(DropdownMenuLabel, { className: "p-0 font-normal", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 px-1 py-1.5 text-left text-sm", children: [
            /* @__PURE__ */ jsx(Avatar, { className: "h-8 w-8 overflow-hidden rounded-full", children: /* @__PURE__ */ jsx(AvatarFallback, { className: "bg-secondary text-foreground rounded-lg", children: getInitials(admin.name) }) }),
            /* @__PURE__ */ jsxs("div", { className: "grid flex-1 text-left text-sm leading-tight", children: [
              /* @__PURE__ */ jsx("span", { className: "truncate font-medium", children: admin.name }),
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground truncate text-xs", children: admin.email })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
          /* @__PURE__ */ jsx(DropdownMenuGroup, { children: /* @__PURE__ */ jsxs(DropdownMenuSub, { children: [
            /* @__PURE__ */ jsxs(DropdownMenuSubTrigger, { children: [
              /* @__PURE__ */ jsx(Languages, { className: "mr-2" }),
              t("platform.locale.label")
            ] }),
            /* @__PURE__ */ jsx(DropdownMenuSubContent, { children: LOCALES$2.map((code) => /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => setLocale(code), children: [
              t(`platform.locale.${code}`),
              locale === code && /* @__PURE__ */ jsx(Check, { className: "ml-auto size-4" })
            ] }, code)) })
          ] }) }),
          /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
          /* @__PURE__ */ jsx(DropdownMenuItem, { asChild: true, children: /* @__PURE__ */ jsxs(Link, { className: "block w-full", method: "post", href: route("admin.logout"), as: "button", children: [
            /* @__PURE__ */ jsx(LogOut, { className: "mr-2" }),
            t("platform.nav.logout")
          ] }) })
        ]
      }
    )
  ] }) }) });
}
function AdminSidebar() {
  var _a;
  const t = useTranslator();
  const path = window.location.pathname;
  const { auth } = usePage().props;
  const adminPermissions = ((_a = auth.admin) == null ? void 0 : _a.permissions) ?? [];
  const baseItems = [
    { title: t("platform.admin.nav.dashboard"), href: "/admin/dashboard", icon: LayoutGrid, permission: null },
    { title: t("platform.admin.nav.workspaces"), href: "/admin/workspaces", icon: Building2, permission: "platform.workspaces.view" },
    { title: t("platform.admin.nav.announcements"), href: "/admin/announcements", icon: Megaphone, permission: "platform.announcements.manage" }
  ];
  const items = baseItems.filter((item) => item.permission === null || adminPermissions.includes(item.permission));
  return /* @__PURE__ */ jsxs(Sidebar, { collapsible: "icon", variant: "inset", children: [
    /* @__PURE__ */ jsx(SidebarHeader, { children: /* @__PURE__ */ jsx(SidebarMenu, { children: /* @__PURE__ */ jsx(SidebarMenuItem, { children: /* @__PURE__ */ jsxs(SidebarMenuButton, { size: "lg", className: "cursor-default hover:bg-transparent active:bg-transparent", children: [
      /* @__PURE__ */ jsx("div", { className: "bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg", children: /* @__PURE__ */ jsx(ShieldCheck, { className: "size-5" }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid flex-1 text-left text-sm leading-tight", children: [
        /* @__PURE__ */ jsx("span", { className: "truncate font-semibold", children: t("platform.admin.title") }),
        /* @__PURE__ */ jsx("span", { className: "text-muted-foreground truncate text-xs", children: t("platform.admin.badge") })
      ] })
    ] }) }) }) }),
    /* @__PURE__ */ jsx(SidebarContent, { children: /* @__PURE__ */ jsx(SidebarGroup, { children: /* @__PURE__ */ jsx(SidebarMenu, { children: items.map((item) => /* @__PURE__ */ jsx(SidebarMenuItem, { children: /* @__PURE__ */ jsx(SidebarMenuButton, { asChild: true, isActive: path === item.href || path.startsWith(item.href + "/"), tooltip: item.title, children: /* @__PURE__ */ jsxs(Link, { href: item.href, prefetch: true, children: [
      /* @__PURE__ */ jsx(item.icon, {}),
      /* @__PURE__ */ jsx("span", { children: item.title })
    ] }) }) }, item.href)) }) }) }),
    /* @__PURE__ */ jsx(SidebarFooter, { children: /* @__PURE__ */ jsx(AdminNavUser, {}) }),
    /* @__PURE__ */ jsx(SidebarRail, {})
  ] });
}
function AppContent({ variant = "header", children, ...props }) {
  if (variant === "sidebar") {
    return /* @__PURE__ */ jsx(SidebarInset, { ...props, children });
  }
  return /* @__PURE__ */ jsx("main", { className: "mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-4 rounded-xl", ...props, children });
}
function AppShell({ children, variant = "header" }) {
  const [isOpen, setIsOpen] = useState(() => typeof window !== "undefined" ? localStorage.getItem("sidebar") !== "false" : true);
  const handleSidebarChange = (open) => {
    setIsOpen(open);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar", String(open));
    }
  };
  if (variant === "header") {
    return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen w-full flex-col", children });
  }
  return /* @__PURE__ */ jsx(SidebarProvider, { defaultOpen: isOpen, open: isOpen, onOpenChange: handleSidebarChange, children });
}
const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
const applyTheme = (appearance) => {
  const isDark = appearance === "dark" || appearance === "system" && prefersDark();
  document.documentElement.classList.toggle("dark", isDark);
};
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
const handleSystemThemeChange = () => {
  const currentAppearance = localStorage.getItem("appearance");
  applyTheme(currentAppearance || "system");
};
function useAppearance() {
  const [appearance, setAppearance] = useState("system");
  const updateAppearance = (mode) => {
    setAppearance(mode);
    localStorage.setItem("appearance", mode);
    applyTheme(mode);
  };
  useEffect(() => {
    const savedAppearance = localStorage.getItem("appearance");
    updateAppearance(savedAppearance || "system");
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, []);
  return { appearance, updateAppearance };
}
const TABS = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor }
];
function AppearanceToggleTab({ className = "", ...props }) {
  const { appearance, updateAppearance } = useAppearance();
  const t = useTranslator();
  return /* @__PURE__ */ jsx("div", { className: cn("bg-secondary inline-flex gap-1 rounded-lg p-1", className), ...props, children: TABS.map(({ value, icon: Icon }) => /* @__PURE__ */ jsxs(
    "button",
    {
      onClick: () => updateAppearance(value),
      className: cn(
        "flex items-center rounded-md px-3.5 py-1.5 transition-colors",
        appearance === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      ),
      children: [
        /* @__PURE__ */ jsx(Icon, { className: "-ml-1 h-4 w-4" }),
        /* @__PURE__ */ jsx("span", { className: "ml-1.5 text-sm", children: t(`platform.appearance.${value}`) })
      ]
    },
    value
  )) });
}
const Breadcrumb = React.forwardRef(({ ...props }, ref) => /* @__PURE__ */ jsx("nav", { ref, "aria-label": "breadcrumb", ...props }));
Breadcrumb.displayName = "Breadcrumb";
const BreadcrumbList = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("ol", { ref, className: cn("flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5", className), ...props }));
BreadcrumbList.displayName = "BreadcrumbList";
const BreadcrumbItem = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("li", { ref, className: cn("inline-flex items-center gap-1.5", className), ...props }));
BreadcrumbItem.displayName = "BreadcrumbItem";
const BreadcrumbLink = React.forwardRef(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";
  return /* @__PURE__ */ jsx(Comp, { ref, className: cn("transition-colors hover:text-foreground", className), ...props });
});
BreadcrumbLink.displayName = "BreadcrumbLink";
const BreadcrumbPage = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("span", { ref, role: "link", "aria-disabled": "true", "aria-current": "page", className: cn("font-normal text-foreground", className), ...props }));
BreadcrumbPage.displayName = "BreadcrumbPage";
const BreadcrumbSeparator = ({ children, className, ...props }) => /* @__PURE__ */ jsx("li", { role: "presentation", "aria-hidden": "true", className: cn("[&>svg]:h-3.5 [&>svg]:w-3.5", className), ...props, children: children ?? /* @__PURE__ */ jsx(ChevronRight, {}) });
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";
function Breadcrumbs({ breadcrumbs: breadcrumbs2 }) {
  return /* @__PURE__ */ jsx(Fragment, { children: breadcrumbs2.length > 0 && /* @__PURE__ */ jsx(Breadcrumb, { children: /* @__PURE__ */ jsx(BreadcrumbList, { children: breadcrumbs2.map((item, index) => {
    const isLast = index === breadcrumbs2.length - 1;
    return /* @__PURE__ */ jsxs(Fragment$1, { children: [
      /* @__PURE__ */ jsx(BreadcrumbItem, { children: isLast ? /* @__PURE__ */ jsx(BreadcrumbPage, { children: item.title }) : /* @__PURE__ */ jsx(BreadcrumbLink, { href: item.href, children: item.title }) }),
      !isLast && /* @__PURE__ */ jsx(BreadcrumbSeparator, {})
    ] }, index);
  }) }) }) });
}
function AppSidebarHeader({ breadcrumbs: breadcrumbs2 = [] }) {
  return /* @__PURE__ */ jsxs("header", { className: "border-border flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(SidebarTrigger, { className: "-ml-1" }),
      /* @__PURE__ */ jsx(Breadcrumbs, { breadcrumbs: breadcrumbs2 })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "ml-auto flex items-center gap-2", children: /* @__PURE__ */ jsx(AppearanceToggleTab, {}) })
  ] });
}
function AdminLayout({ children, breadcrumbs: breadcrumbs2 = [] }) {
  return /* @__PURE__ */ jsxs(AppShell, { variant: "sidebar", children: [
    /* @__PURE__ */ jsx(AdminSidebar, {}),
    /* @__PURE__ */ jsxs(AppContent, { variant: "sidebar", children: [
      /* @__PURE__ */ jsx(AppSidebarHeader, { breadcrumbs: breadcrumbs2 }),
      children
    ] })
  ] });
}
function AdminDashboard({ stats }) {
  const t = useTranslator();
  const cards2 = [
    { key: "workspaces", icon: Building2, value: stats.workspaces },
    { key: "users", icon: Users, value: stats.users },
    { key: "admins", icon: ShieldCheck, value: stats.admins },
    { key: "signups_24h", icon: UserPlus, value: stats.signups24h }
  ];
  return /* @__PURE__ */ jsxs(AdminLayout, { breadcrumbs: [{ title: t("platform.admin.nav.dashboard"), href: "/admin/dashboard" }], children: [
    /* @__PURE__ */ jsx(Head, { title: t("platform.admin.dashboard.title") }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-4 md:p-6", children: [
      /* @__PURE__ */ jsx(PageHeader, { title: t("platform.admin.dashboard.title"), description: t("platform.admin.dashboard.subtitle") }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4", children: cards2.map((card) => /* @__PURE__ */ jsx(
        StatCard,
        {
          label: t(`platform.admin.dashboard.stats.${card.key}`),
          value: card.value.toLocaleString(),
          icon: card.icon
        },
        card.key
      )) })
    ] })
  ] });
}
const __vite_glob_0_3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminDashboard
}, Symbol.toStringTag, { value: "Module" }));
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function Badge({ className, variant, ...props }) {
  return /* @__PURE__ */ jsx("div", { className: cn(badgeVariants({ variant }), className), ...props });
}
const Table = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { className: "relative w-full overflow-auto", children: /* @__PURE__ */ jsx(
  "table",
  {
    ref,
    className: cn("w-full caption-bottom text-sm", className),
    ...props
  }
) }));
Table.displayName = "Table";
const TableHeader = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("thead", { ref, className: cn("[&_tr]:border-b", className), ...props }));
TableHeader.displayName = "TableHeader";
const TableBody = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "tbody",
  {
    ref,
    className: cn("[&_tr:last-child]:border-0", className),
    ...props
  }
));
TableBody.displayName = "TableBody";
const TableFooter = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "tfoot",
  {
    ref,
    className: cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    ),
    ...props
  }
));
TableFooter.displayName = "TableFooter";
const TableRow = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "tr",
  {
    ref,
    className: cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    ),
    ...props
  }
));
TableRow.displayName = "TableRow";
const TableHead = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "th",
  {
    ref,
    className: cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    ),
    ...props
  }
));
TableHead.displayName = "TableHead";
const TableCell = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "td",
  {
    ref,
    className: cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className),
    ...props
  }
));
TableCell.displayName = "TableCell";
const TableCaption = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "caption",
  {
    ref,
    className: cn("mt-4 text-sm text-muted-foreground", className),
    ...props
  }
));
TableCaption.displayName = "TableCaption";
function AdminWorkspaces({ workspaces }) {
  const t = useTranslator();
  return /* @__PURE__ */ jsxs(AdminLayout, { breadcrumbs: [{ title: t("platform.admin.nav.workspaces"), href: "/admin/workspaces" }], children: [
    /* @__PURE__ */ jsx(Head, { title: t("platform.admin.workspaces.title") }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-6", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold", children: t("platform.admin.workspaces.title") }),
        /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-1 text-sm", children: t("platform.admin.workspaces.subtitle") })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "bg-card rounded-xl border shadow-sm", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: t("platform.admin.workspaces.name") }),
          /* @__PURE__ */ jsx(TableHead, { children: t("platform.admin.workspaces.slug") }),
          /* @__PURE__ */ jsx(TableHead, { children: t("platform.admin.workspaces.status") }),
          /* @__PURE__ */ jsx(TableHead, { children: t("platform.admin.workspaces.currency") }),
          /* @__PURE__ */ jsx(TableHead, { children: t("platform.admin.workspaces.created") })
        ] }) }),
        /* @__PURE__ */ jsxs(TableBody, { children: [
          workspaces.length === 0 && /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 5, className: "text-muted-foreground py-8 text-center", children: t("platform.admin.workspaces.empty") }) }),
          workspaces.map((workspace) => /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: /* @__PURE__ */ jsx(Link, { href: `/admin/workspaces/${workspace.id}`, className: "hover:underline", children: workspace.name }) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground", children: workspace.slug }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: workspace.status }) }),
            /* @__PURE__ */ jsx(TableCell, { className: "tabular-nums", children: workspace.base_currency }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground tabular-nums", children: workspace.created_at })
          ] }, workspace.id))
        ] })
      ] }) })
    ] })
  ] });
}
const __vite_glob_0_4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminWorkspaces
}, Symbol.toStringTag, { value: "Module" }));
function AdminWorkspaceShow({ workspace, members }) {
  const t = useTranslator();
  const impersonate = (userId) => {
    router.post(`/admin/workspaces/${workspace.id}/members/${userId}/impersonate`);
  };
  return /* @__PURE__ */ jsxs(
    AdminLayout,
    {
      breadcrumbs: [
        { title: t("platform.admin.nav.workspaces"), href: "/admin/workspaces" },
        { title: workspace.name, href: `/admin/workspaces/${workspace.id}` }
      ],
      children: [
        /* @__PURE__ */ jsx(Head, { title: workspace.name }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-6", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold", children: workspace.name }),
            /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground mt-1 text-sm", children: [
              workspace.slug,
              " · ",
              workspace.base_currency,
              " · ",
              workspace.timezone
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { className: "mb-3 text-lg font-medium", children: t("platform.admin.members.title") }),
            /* @__PURE__ */ jsx("div", { className: "bg-card rounded-xl border shadow-sm", children: /* @__PURE__ */ jsxs(Table, { children: [
              /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
                /* @__PURE__ */ jsx(TableHead, { children: t("platform.admin.members.name") }),
                /* @__PURE__ */ jsx(TableHead, { children: t("platform.admin.members.email") }),
                /* @__PURE__ */ jsx(TableHead, { children: t("platform.admin.members.role") }),
                /* @__PURE__ */ jsx(TableHead, { children: t("platform.admin.members.status") }),
                /* @__PURE__ */ jsx(TableHead, { className: "text-right" })
              ] }) }),
              /* @__PURE__ */ jsxs(TableBody, { children: [
                members.length === 0 && /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 5, className: "text-muted-foreground py-8 text-center", children: t("platform.admin.members.empty") }) }),
                members.map((member) => /* @__PURE__ */ jsxs(TableRow, { children: [
                  /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: member.name }),
                  /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground", children: member.email }),
                  /* @__PURE__ */ jsx(TableCell, { children: t(`platform.roles.${member.role}`) }),
                  /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: t(`platform.statuses.${member.status}`) }) }),
                  /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "sm",
                      variant: "outline",
                      disabled: member.status !== "active",
                      onClick: () => impersonate(member.user_id),
                      children: t("platform.admin.members.impersonate")
                    }
                  ) })
                ] }, member.id))
              ] })
            ] }) })
          ] })
        ] })
      ]
    }
  );
}
const __vite_glob_0_5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminWorkspaceShow
}, Symbol.toStringTag, { value: "Module" }));
const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;
const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  SelectPrimitive.Trigger,
  {
    ref,
    className: cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    ),
    ...props,
    children: [
      children,
      /* @__PURE__ */ jsx(SelectPrimitive.Icon, { asChild: true, children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 opacity-50" }) })
    ]
  }
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;
const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.ScrollUpButton, { ref, className: cn("flex cursor-default items-center justify-center py-1", className), ...props, children: /* @__PURE__ */ jsx(ChevronUp, { className: "h-4 w-4" }) }));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;
const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.ScrollDownButton, { ref, className: cn("flex cursor-default items-center justify-center py-1", className), ...props, children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4" }) }));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;
const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Portal, { children: /* @__PURE__ */ jsxs(
  SelectPrimitive.Content,
  {
    ref,
    className: cn(
      "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
      className
    ),
    position,
    ...props,
    children: [
      /* @__PURE__ */ jsx(SelectScrollUpButton, {}),
      /* @__PURE__ */ jsx(
        SelectPrimitive.Viewport,
        {
          className: cn(
            "p-1",
            position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          ),
          children
        }
      ),
      /* @__PURE__ */ jsx(SelectScrollDownButton, {})
    ]
  }
) }));
SelectContent.displayName = SelectPrimitive.Content.displayName;
const SelectLabel = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Label, { ref, className: cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className), ...props })
);
SelectLabel.displayName = SelectPrimitive.Label.displayName;
const SelectItem = React.forwardRef(
  ({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
    SelectPrimitive.Item,
    {
      ref,
      className: cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      ),
      ...props,
      children: [
        /* @__PURE__ */ jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsx(SelectPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) }) }),
        /* @__PURE__ */ jsx(SelectPrimitive.ItemText, { children })
      ]
    }
  )
);
SelectItem.displayName = SelectPrimitive.Item.displayName;
const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Separator, { ref, className: cn("-mx-1 my-1 h-px bg-muted", className), ...props }));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
function AdminAnnouncementsCreate({ categories }) {
  const t = useTranslator();
  const { data, setData, post, processing, errors } = useForm({
    title: "",
    slug: "",
    body: "",
    category: "",
    cover_image: "",
    audience: { type: "all" }
  });
  const handleSubmit = (e) => {
    e.preventDefault();
    post("/admin/announcements");
  };
  const bodyLength = data.body.length;
  return /* @__PURE__ */ jsxs(
    AdminLayout,
    {
      breadcrumbs: [
        { title: t("platform.announcements.admin.nav"), href: "/admin/announcements" },
        { title: t("platform.announcements.admin.form.create_title"), href: "/admin/announcements/create" }
      ],
      children: [
        /* @__PURE__ */ jsx(Head, { title: t("platform.announcements.admin.form.create_title") }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold", children: t("platform.announcements.admin.form.create_title") }),
            /* @__PURE__ */ jsx(Button, { variant: "outline", asChild: true, children: /* @__PURE__ */ jsx(Link, { href: "/admin/announcements", children: t("platform.announcements.admin.form.back") }) })
          ] }),
          /* @__PURE__ */ jsx("form", { onSubmit: handleSubmit, className: "bg-card max-w-2xl rounded-xl border p-6 shadow-sm", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-5", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "title", children: t("platform.announcements.admin.form.title") }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  id: "title",
                  value: data.title,
                  onChange: (e) => setData("title", e.target.value),
                  placeholder: t("platform.announcements.admin.form.title_hint"),
                  maxLength: 255
                }
              ),
              errors.title && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.title }),
              /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: t("platform.announcements.admin.form.title_hint") })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "slug", children: t("platform.announcements.admin.form.slug") }),
              /* @__PURE__ */ jsx(Input, { id: "slug", value: data.slug, onChange: (e) => setData("slug", e.target.value), maxLength: 255 }),
              errors.slug && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.slug })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "category", children: t("platform.announcements.admin.form.category") }),
              /* @__PURE__ */ jsxs(Select, { value: data.category, onValueChange: (v) => setData("category", v), children: [
                /* @__PURE__ */ jsx(SelectTrigger, { id: "category", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: t("platform.announcements.admin.form.category") }) }),
                /* @__PURE__ */ jsx(SelectContent, { children: categories.map((cat) => /* @__PURE__ */ jsx(SelectItem, { value: cat, children: t(`platform.announcements.category.${cat}`) }, cat)) })
              ] }),
              errors.category && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.category })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "body", children: t("platform.announcements.admin.form.body") }),
                /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs", children: t("platform.announcements.admin.form.body_counter", { count: bodyLength }) })
              ] }),
              /* @__PURE__ */ jsx(
                "textarea",
                {
                  id: "body",
                  value: data.body,
                  onChange: (e) => setData("body", e.target.value),
                  rows: 12,
                  maxLength: 2e4,
                  className: "border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[200px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                }
              ),
              errors.body && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.body })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "cover_image", children: t("platform.announcements.admin.form.cover_image") }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  id: "cover_image",
                  type: "url",
                  value: data.cover_image,
                  onChange: (e) => setData("cover_image", e.target.value),
                  placeholder: "https://"
                }
              ),
              errors.cover_image && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.cover_image })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
              /* @__PURE__ */ jsx(Label, { children: t("platform.announcements.admin.form.audience") }),
              /* @__PURE__ */ jsx("p", { className: "text-muted-foreground rounded-md border px-3 py-2 text-sm", children: t("platform.announcements.admin.form.audience_value") })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsx(Button, { type: "submit", disabled: processing, children: t("platform.announcements.admin.form.save") }) })
          ] }) })
        ] })
      ]
    }
  );
}
const __vite_glob_0_6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminAnnouncementsCreate
}, Symbol.toStringTag, { value: "Module" }));
function AdminAnnouncementsEdit({ announcement, categories }) {
  const t = useTranslator();
  const { data, setData, put, processing, errors } = useForm({
    title: announcement.title,
    slug: announcement.slug ?? "",
    body: announcement.body,
    category: announcement.category ?? "",
    cover_image: announcement.cover_image ?? "",
    audience: announcement.audience ?? { type: "all" }
  });
  const isPublished = announcement.status === "published";
  const bodyLength = data.body.length;
  const handleSubmit = (e) => {
    e.preventDefault();
    put(`/admin/announcements/${announcement.id}`);
  };
  const handlePublish = () => {
    router.post(`/admin/announcements/${announcement.id}/publish`);
  };
  const handleUnpublish = () => {
    router.delete(`/admin/announcements/${announcement.id}/publish`);
  };
  return /* @__PURE__ */ jsxs(
    AdminLayout,
    {
      breadcrumbs: [
        { title: t("platform.announcements.admin.nav"), href: "/admin/announcements" },
        { title: announcement.title, href: `/admin/announcements/${announcement.id}/edit` }
      ],
      children: [
        /* @__PURE__ */ jsx(Head, { title: t("platform.announcements.admin.form.edit_title") }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold", children: t("platform.announcements.admin.form.edit_title") }),
              announcement.status && /* @__PURE__ */ jsx(Badge, { variant: isPublished ? "default" : "secondary", children: t(`platform.announcements.admin.status.${announcement.status}`) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              isPublished ? /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: handleUnpublish, disabled: processing, children: t("platform.announcements.admin.form.unpublish") }) : /* @__PURE__ */ jsx(Button, { variant: "default", onClick: handlePublish, disabled: processing, children: t("platform.announcements.admin.form.publish") }),
              /* @__PURE__ */ jsx(Button, { variant: "outline", asChild: true, children: /* @__PURE__ */ jsx(Link, { href: "/admin/announcements", children: t("platform.announcements.admin.form.back") }) })
            ] })
          ] }),
          /* @__PURE__ */ jsx("form", { onSubmit: handleSubmit, className: "bg-card max-w-2xl rounded-xl border p-6 shadow-sm", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-5", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "title", children: t("platform.announcements.admin.form.title") }),
              /* @__PURE__ */ jsx(Input, { id: "title", value: data.title, onChange: (e) => setData("title", e.target.value), maxLength: 255 }),
              errors.title && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.title })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "slug", children: t("platform.announcements.admin.form.slug") }),
              /* @__PURE__ */ jsx(Input, { id: "slug", value: data.slug, onChange: (e) => setData("slug", e.target.value), maxLength: 255 }),
              errors.slug && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.slug }),
              /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: t("platform.announcements.admin.form.title_hint") })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "category", children: t("platform.announcements.admin.form.category") }),
              /* @__PURE__ */ jsxs(Select, { value: data.category, onValueChange: (v) => setData("category", v), children: [
                /* @__PURE__ */ jsx(SelectTrigger, { id: "category", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: t("platform.announcements.admin.form.category") }) }),
                /* @__PURE__ */ jsx(SelectContent, { children: categories.map((cat) => /* @__PURE__ */ jsx(SelectItem, { value: cat, children: t(`platform.announcements.category.${cat}`) }, cat)) })
              ] }),
              errors.category && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.category })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "body", children: t("platform.announcements.admin.form.body") }),
                /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs", children: t("platform.announcements.admin.form.body_counter", { count: bodyLength }) })
              ] }),
              /* @__PURE__ */ jsx(
                "textarea",
                {
                  id: "body",
                  value: data.body,
                  onChange: (e) => setData("body", e.target.value),
                  rows: 12,
                  maxLength: 2e4,
                  className: "border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[200px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                }
              ),
              errors.body && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.body })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "cover_image", children: t("platform.announcements.admin.form.cover_image") }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  id: "cover_image",
                  type: "url",
                  value: data.cover_image,
                  onChange: (e) => setData("cover_image", e.target.value),
                  placeholder: "https://"
                }
              ),
              errors.cover_image && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.cover_image })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
              /* @__PURE__ */ jsx(Label, { children: t("platform.announcements.admin.form.audience") }),
              /* @__PURE__ */ jsx("p", { className: "text-muted-foreground rounded-md border px-3 py-2 text-sm", children: t("platform.announcements.admin.form.audience_value") })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsx(Button, { type: "submit", disabled: processing, children: t("platform.announcements.admin.form.save") }) })
          ] }) })
        ] })
      ]
    }
  );
}
const __vite_glob_0_7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminAnnouncementsEdit
}, Symbol.toStringTag, { value: "Module" }));
function formatDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(void 0, { dateStyle: "medium" }).format(new Date(iso));
}
function AdminAnnouncementsIndex({ announcements }) {
  const t = useTranslator();
  const handleDelete = (id) => {
    if (!window.confirm(t("platform.announcements.admin.delete_confirm"))) return;
    router.delete(`/admin/announcements/${id}`);
  };
  return /* @__PURE__ */ jsxs(AdminLayout, { breadcrumbs: [{ title: t("platform.announcements.admin.nav"), href: "/admin/announcements" }], children: [
    /* @__PURE__ */ jsx(Head, { title: t("platform.announcements.admin.title") }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold", children: t("platform.announcements.admin.title") }),
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-1 text-sm", children: t("platform.announcements.admin.subtitle") })
        ] }),
        /* @__PURE__ */ jsx(Button, { asChild: true, children: /* @__PURE__ */ jsx(Link, { href: "/admin/announcements/create", children: t("platform.announcements.admin.new") }) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "bg-card rounded-xl border shadow-sm", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: t("platform.announcements.admin.col_title") }),
          /* @__PURE__ */ jsx(TableHead, { children: t("platform.announcements.admin.col_category") }),
          /* @__PURE__ */ jsx(TableHead, { children: t("platform.announcements.admin.col_status") }),
          /* @__PURE__ */ jsx(TableHead, { children: t("platform.announcements.admin.col_published") }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: t("platform.announcements.admin.col_actions") })
        ] }) }),
        /* @__PURE__ */ jsxs(TableBody, { children: [
          announcements.length === 0 && /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 5, className: "text-muted-foreground py-8 text-center", children: t("platform.announcements.admin.empty") }) }),
          announcements.map((announcement) => /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxs(TableCell, { className: "font-medium", children: [
              /* @__PURE__ */ jsx(Link, { href: `/admin/announcements/${announcement.id}/edit`, className: "hover:underline", children: announcement.title }),
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground ml-2 text-xs", children: announcement.slug })
            ] }),
            /* @__PURE__ */ jsx(TableCell, { children: announcement.category && /* @__PURE__ */ jsx(Badge, { variant: "outline", children: t(`platform.announcements.category.${announcement.category}`) }) }),
            /* @__PURE__ */ jsx(TableCell, { children: announcement.status && /* @__PURE__ */ jsx(Badge, { variant: announcement.status === "published" ? "default" : "secondary", children: t(`platform.announcements.admin.status.${announcement.status}`) }) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground tabular-nums", children: formatDate(announcement.published_at) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-end gap-2", children: [
              /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", asChild: true, children: /* @__PURE__ */ jsx(Link, { href: `/admin/announcements/${announcement.id}/edit`, children: t("platform.actions.edit") }) }),
              /* @__PURE__ */ jsx(
                Button,
                {
                  size: "sm",
                  variant: "outline",
                  className: "text-destructive hover:text-destructive",
                  onClick: () => handleDelete(announcement.id),
                  children: t("platform.actions.delete")
                }
              )
            ] }) })
          ] }, announcement.id))
        ] })
      ] }) })
    ] })
  ] });
}
const __vite_glob_0_8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminAnnouncementsIndex
}, Symbol.toStringTag, { value: "Module" }));
function AnnouncementBody({ bodyHtml }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: "prose prose-sm dark:prose-invert max-w-none",
      dangerouslySetInnerHTML: { __html: bodyHtml }
    }
  );
}
const CATEGORY_VARIANT = {
  feature: "default",
  improvement: "secondary",
  fix: "destructive",
  announcement: "outline",
  maintenance: "outline"
};
function useRelativeTime(isoDate) {
  const { locale } = usePage().props;
  if (!isoDate) return "";
  const diffMs = new Date(isoDate).getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1e3);
  const absS = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(locale ?? "vi", { numeric: "auto" });
  if (absS < 60) return rtf.format(diffSec, "second");
  if (absS < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (absS < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (absS < 2592e3) return rtf.format(Math.round(diffSec / 86400), "day");
  if (absS < 31536e3) return rtf.format(Math.round(diffSec / 2592e3), "month");
  return rtf.format(Math.round(diffSec / 31536e3), "year");
}
function AnnouncementCard({ announcement, onMarkRead }) {
  const t = useTranslator();
  const relativeTime = useRelativeTime(announcement.published_at);
  const categoryLabel = t(`platform.announcements.category.${announcement.category}`);
  const variant = CATEGORY_VARIANT[announcement.category] ?? "outline";
  return /* @__PURE__ */ jsxs("article", { className: "bg-card border-border flex flex-col gap-4 rounded-lg border p-5", children: [
    announcement.cover_image && /* @__PURE__ */ jsx("img", { src: announcement.cover_image, alt: "", "aria-hidden": "true", className: "h-40 w-full rounded-md object-cover" }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-1", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Badge, { variant, children: categoryLabel }),
          !announcement.is_read && /* @__PURE__ */ jsx("span", { "aria-label": "Unread", className: "bg-primary inline-block h-2 w-2 rounded-full" })
        ] }),
        /* @__PURE__ */ jsx("h3", { className: "text-base leading-snug font-semibold", children: announcement.title }),
        /* @__PURE__ */ jsx("time", { dateTime: announcement.published_at ?? void 0, className: "text-muted-foreground text-xs", children: relativeTime })
      ] }),
      !announcement.is_read && onMarkRead && /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => onMarkRead(announcement.id),
          className: "text-muted-foreground hover:text-foreground shrink-0 text-xs underline-offset-2 hover:underline",
          children: t("platform.announcements.mark_read")
        }
      )
    ] }),
    /* @__PURE__ */ jsx(AnnouncementBody, { bodyHtml: announcement.body_html })
  ] });
}
const Dialog = SheetPrimitive.Root;
const DialogTrigger = SheetPrimitive.Trigger;
const DialogPortal = SheetPrimitive.Portal;
const DialogClose = SheetPrimitive.Close;
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Overlay,
  {
    ref,
    className: cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props
  }
));
DialogOverlay.displayName = SheetPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(DialogPortal, { children: [
  /* @__PURE__ */ jsx(DialogOverlay, {}),
  /* @__PURE__ */ jsxs(
    SheetPrimitive.Content,
    {
      ref,
      className: cn(
        // "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsxs(SheetPrimitive.Close, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground", children: [
          /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close" })
        ] })
      ]
    }
  )
] }));
DialogContent.displayName = SheetPrimitive.Content.displayName;
const DialogHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", { className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className), ...props });
DialogHeader.displayName = "DialogHeader";
const DialogFooter = ({ className, ...props }) => /* @__PURE__ */ jsx("div", { className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className), ...props });
DialogFooter.displayName = "DialogFooter";
const DialogTitle = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(SheetPrimitive.Title, { ref, className: cn("text-lg font-semibold leading-none tracking-tight", className), ...props })
);
DialogTitle.displayName = SheetPrimitive.Title.displayName;
const DialogDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SheetPrimitive.Description, { ref, className: cn("text-sm text-muted-foreground", className), ...props }));
DialogDescription.displayName = SheetPrimitive.Description.displayName;
const STORAGE_KEY_PREFIX = "announcement_modal_seen_";
function useAnnouncementModal(latestId) {
  const storageKey = latestId ? `${STORAGE_KEY_PREFIX}${latestId}` : null;
  const [isOpen, setIsOpen] = useState(() => {
    if (!storageKey) return false;
    try {
      return sessionStorage.getItem(storageKey) === null;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!storageKey) {
      setIsOpen(false);
      return;
    }
    try {
      setIsOpen(sessionStorage.getItem(storageKey) === null);
    } catch {
      setIsOpen(false);
    }
  }, [storageKey]);
  const close = useCallback(() => {
    if (storageKey) {
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {
      }
    }
    setIsOpen(false);
  }, [storageKey]);
  return { isOpen, close };
}
function WhatsNewModal() {
  const t = useTranslator();
  const { latestUnreadAnnouncement } = usePage().props;
  const { isOpen, close } = useAnnouncementModal(latestUnreadAnnouncement == null ? void 0 : latestUnreadAnnouncement.id);
  if (!latestUnreadAnnouncement) return null;
  function handleGotIt() {
    close();
    router.post(route("announcements.read", { announcement: latestUnreadAnnouncement.id }), {}, { preserveState: true, preserveScroll: true });
  }
  return /* @__PURE__ */ jsx(
    Dialog,
    {
      open: isOpen,
      onOpenChange: (open) => {
        if (!open) close();
      },
      children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[85vh] max-w-xl overflow-y-auto", children: [
        /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: t("platform.announcements.modal_title") }) }),
        latestUnreadAnnouncement.cover_image && /* @__PURE__ */ jsx("img", { src: latestUnreadAnnouncement.cover_image, alt: "", "aria-hidden": "true", className: "h-44 w-full rounded-md object-cover" }),
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold", children: latestUnreadAnnouncement.title }),
        /* @__PURE__ */ jsx(AnnouncementBody, { bodyHtml: latestUnreadAnnouncement.body_html }),
        /* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx(Button, { onClick: handleGotIt, children: t("platform.announcements.got_it") }) })
      ] })
    }
  );
}
const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;
function NavMain({ groups = [] }) {
  const page = usePage();
  return /* @__PURE__ */ jsx(Fragment, { children: groups.map((group) => /* @__PURE__ */ jsxs(SidebarGroup, { className: "px-2 py-0", children: [
    /* @__PURE__ */ jsx(SidebarGroupLabel, { children: group.title }),
    /* @__PURE__ */ jsx(SidebarMenu, { children: group.items.map(
      (item) => {
        var _a;
        return ((_a = item.items) == null ? void 0 : _a.length) ? /* @__PURE__ */ jsx(
          Collapsible,
          {
            asChild: true,
            defaultOpen: item.items.some((sub) => sub.url === page.url),
            className: "group/collapsible",
            children: /* @__PURE__ */ jsxs(SidebarMenuItem, { children: [
              /* @__PURE__ */ jsx(CollapsibleTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(SidebarMenuButton, { tooltip: item.title, children: [
                item.icon && /* @__PURE__ */ jsx(item.icon, {}),
                /* @__PURE__ */ jsx("span", { children: item.title }),
                /* @__PURE__ */ jsx(ChevronRight, { className: "ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" })
              ] }) }),
              /* @__PURE__ */ jsx(CollapsibleContent, { children: /* @__PURE__ */ jsx(SidebarMenuSub, { children: item.items.map((sub) => /* @__PURE__ */ jsx(SidebarMenuSubItem, { children: /* @__PURE__ */ jsx(SidebarMenuSubButton, { asChild: true, isActive: sub.url === page.url, children: /* @__PURE__ */ jsxs(Link, { href: sub.url, prefetch: true, children: [
                /* @__PURE__ */ jsx("span", { children: sub.title }),
                sub.badge != null && /* @__PURE__ */ jsx("span", { className: "text-muted-foreground ml-auto text-xs tabular-nums", children: sub.badge })
              ] }) }) }, sub.title)) }) })
            ] })
          },
          item.title
        ) : /* @__PURE__ */ jsxs(SidebarMenuItem, { children: [
          /* @__PURE__ */ jsx(SidebarMenuButton, { asChild: true, tooltip: item.title, isActive: item.url === page.url, children: /* @__PURE__ */ jsxs(Link, { href: item.url, prefetch: true, children: [
            item.icon && /* @__PURE__ */ jsx(item.icon, {}),
            /* @__PURE__ */ jsx("span", { children: item.title })
          ] }) }),
          item.badge != null && /* @__PURE__ */ jsx(SidebarMenuBadge, { children: item.badge })
        ] }, item.title);
      }
    ) })
  ] }, group.title)) });
}
function UserInfo({ user, showEmail = false }) {
  const getInitials = useInitials();
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(Avatar, { className: "h-8 w-8 overflow-hidden rounded-full", children: [
      /* @__PURE__ */ jsx(AvatarImage, { src: user.avatar, alt: user.name }),
      /* @__PURE__ */ jsx(AvatarFallback, { className: "bg-secondary text-foreground rounded-lg", children: getInitials(user.name) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid flex-1 text-left text-sm leading-tight", children: [
      /* @__PURE__ */ jsx("span", { className: "truncate font-medium", children: user.name }),
      showEmail && /* @__PURE__ */ jsx("span", { className: "text-muted-foreground truncate text-xs", children: user.email })
    ] })
  ] });
}
function useMobileNavigation() {
  const cleanup = useCallback(() => {
    document.body.style.removeProperty("pointer-events");
  }, []);
  return cleanup;
}
const LOCALES$1 = ["vi", "en"];
function UserMenuContent({ user }) {
  const cleanup = useMobileNavigation();
  const t = useTranslator();
  const { locale } = usePage().props;
  const setLocale = (next) => {
    if (next !== locale) {
      router.put(route("locale"), { locale: next }, { preserveScroll: true });
    }
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(DropdownMenuLabel, { className: "p-0 font-normal", children: /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 px-1 py-1.5 text-left text-sm", children: /* @__PURE__ */ jsx(UserInfo, { user, showEmail: true }) }) }),
    /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
    /* @__PURE__ */ jsxs(DropdownMenuGroup, { children: [
      /* @__PURE__ */ jsx(DropdownMenuItem, { asChild: true, children: /* @__PURE__ */ jsxs(Link, { className: "block w-full", href: route("profile.edit"), as: "button", prefetch: true, onClick: cleanup, children: [
        /* @__PURE__ */ jsx(Settings, { className: "mr-2" }),
        t("platform.nav.settings")
      ] }) }),
      /* @__PURE__ */ jsxs(DropdownMenuSub, { children: [
        /* @__PURE__ */ jsxs(DropdownMenuSubTrigger, { children: [
          /* @__PURE__ */ jsx(Languages, { className: "mr-2" }),
          t("platform.locale.label")
        ] }),
        /* @__PURE__ */ jsx(DropdownMenuSubContent, { children: LOCALES$1.map((code) => /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => setLocale(code), children: [
          t(`platform.locale.${code}`),
          locale === code && /* @__PURE__ */ jsx(Check, { className: "ml-auto size-4" })
        ] }, code)) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
    /* @__PURE__ */ jsx(DropdownMenuItem, { asChild: true, children: /* @__PURE__ */ jsxs(Link, { className: "block w-full", method: "post", href: route("logout"), as: "button", onClick: cleanup, children: [
      /* @__PURE__ */ jsx(LogOut, { className: "mr-2" }),
      t("platform.nav.logout")
    ] }) })
  ] });
}
function NavUser() {
  const { auth } = usePage().props;
  const { state } = useSidebar();
  const isMobile = useIsMobile();
  if (!auth.user) return null;
  return /* @__PURE__ */ jsx(SidebarMenu, { children: /* @__PURE__ */ jsx(SidebarMenuItem, { children: /* @__PURE__ */ jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(SidebarMenuButton, { size: "lg", className: "text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent group", children: [
      /* @__PURE__ */ jsx(UserInfo, { user: auth.user }),
      /* @__PURE__ */ jsx(ChevronsUpDown, { className: "ml-auto size-4" })
    ] }) }),
    /* @__PURE__ */ jsx(
      DropdownMenuContent,
      {
        className: "w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg",
        align: "end",
        side: isMobile ? "bottom" : state === "collapsed" ? "left" : "bottom",
        children: /* @__PURE__ */ jsx(UserMenuContent, { user: auth.user })
      }
    )
  ] }) }) });
}
function WorkspaceSwitcher() {
  var _a;
  const { isMobile } = useSidebar();
  const t = useTranslator();
  const { auth, activeWorkspace } = usePage().props;
  const workspaces = auth.workspaces ?? [];
  const active = activeWorkspace ?? workspaces[0] ?? null;
  const role = (_a = auth.membership) == null ? void 0 : _a.role;
  const switchTo = (id) => {
    if (id !== (active == null ? void 0 : active.id)) {
      router.post(route("workspaces.switch", id), {}, { preserveScroll: true });
    }
  };
  return /* @__PURE__ */ jsx(SidebarMenu, { children: /* @__PURE__ */ jsx(SidebarMenuItem, { children: /* @__PURE__ */ jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(SidebarMenuButton, { size: "lg", className: "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground", children: [
      /* @__PURE__ */ jsx("div", { className: "bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg", children: /* @__PURE__ */ jsx(AppLogoIcon, { className: "text-sidebar-primary-foreground size-5 fill-current" }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid flex-1 text-left text-sm leading-tight", children: [
        /* @__PURE__ */ jsx("span", { className: "truncate font-semibold", children: (active == null ? void 0 : active.name) ?? "Yona" }),
        role && /* @__PURE__ */ jsx("span", { className: "text-muted-foreground truncate text-xs", children: t(`platform.roles.${role}`) })
      ] }),
      /* @__PURE__ */ jsx(ChevronsUpDown, { className: "ml-auto" })
    ] }) }),
    /* @__PURE__ */ jsxs(
      DropdownMenuContent,
      {
        className: "w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg",
        align: "start",
        side: isMobile ? "bottom" : "right",
        sideOffset: 4,
        children: [
          /* @__PURE__ */ jsx(DropdownMenuLabel, { className: "text-muted-foreground text-xs", children: t("platform.workspace.list_label") }),
          workspaces.map((workspace) => /* @__PURE__ */ jsxs(DropdownMenuItem, { className: "gap-2 p-2", onClick: () => switchTo(workspace.id), children: [
            /* @__PURE__ */ jsx("div", { className: "bg-sidebar-primary text-sidebar-primary-foreground flex size-6 items-center justify-center rounded-sm", children: /* @__PURE__ */ jsx(AppLogoIcon, { className: "text-sidebar-primary-foreground size-3.5 fill-current" }) }),
            /* @__PURE__ */ jsx("span", { className: "flex-1 truncate", children: workspace.name }),
            workspace.id === (active == null ? void 0 : active.id) && /* @__PURE__ */ jsx(Check, { className: "size-4" })
          ] }, workspace.id)),
          /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
          /* @__PURE__ */ jsxs(DropdownMenuItem, { className: "gap-2 p-2", disabled: true, children: [
            /* @__PURE__ */ jsx("div", { className: "bg-background flex size-6 items-center justify-center rounded-md border", children: /* @__PURE__ */ jsx(Plus, { className: "size-4" }) }),
            /* @__PURE__ */ jsx("div", { className: "text-muted-foreground font-medium", children: t("platform.workspace.add") })
          ] })
        ]
      }
    )
  ] }) }) });
}
function AppSidebar() {
  var _a;
  const t = useTranslator();
  const { auth, unreadAnnouncementCount } = usePage().props;
  const permissions = ((_a = auth.membership) == null ? void 0 : _a.permissions) ?? [];
  const can = (permission) => permissions.includes(permission);
  const unreadBadge = unreadAnnouncementCount ? unreadAnnouncementCount : void 0;
  const crmCandidates = [
    can("tenant.client.view") && { title: t("platform.nav.clients"), url: "/clients", icon: Building2 },
    can("tenant.lead.view") && { title: t("platform.nav.leads"), url: "/leads", icon: Target },
    can("tenant.project.view") && { title: t("platform.nav.projects"), url: "/projects", icon: FolderKanban },
    can("tenant.task.view") && { title: t("platform.nav.tasks"), url: "/tasks", icon: ListChecks },
    can("tenant.automation.manage") && { title: t("platform.nav.automation"), url: "/automation/workflows", icon: GitBranch }
  ];
  const crmItems = crmCandidates.filter((item) => item !== false);
  const navGroups = [
    {
      title: t("platform.nav.overview"),
      items: [
        { title: t("platform.nav.dashboard"), url: "/dashboard", icon: LayoutGrid },
        { title: t("platform.nav.inbox"), url: "/inbox", icon: Inbox },
        { title: t("platform.nav.integrations"), url: "/integrations", icon: Plug }
      ]
    },
    ...crmItems.length > 0 ? [{ title: t("platform.nav.crm"), items: crmItems }] : [],
    {
      title: t("platform.announcements.nav_label"),
      items: [
        {
          title: t("platform.announcements.nav_label"),
          url: "/whats-new",
          icon: Sparkles,
          badge: unreadBadge
        }
      ]
    }
  ];
  return /* @__PURE__ */ jsxs(Sidebar, { collapsible: "icon", variant: "inset", children: [
    /* @__PURE__ */ jsx(SidebarHeader, { children: /* @__PURE__ */ jsx(WorkspaceSwitcher, {}) }),
    /* @__PURE__ */ jsx(SidebarContent, { children: /* @__PURE__ */ jsx(NavMain, { groups: navGroups }) }),
    /* @__PURE__ */ jsx(SidebarSeparator, {}),
    /* @__PURE__ */ jsx(SidebarFooter, { children: /* @__PURE__ */ jsx(NavUser, {}) }),
    /* @__PURE__ */ jsx(SidebarRail, {})
  ] });
}
function ImpersonationBanner() {
  const t = useTranslator();
  const { auth } = usePage().props;
  if (!auth.impersonating) {
    return null;
  }
  return /* @__PURE__ */ jsxs("div", { className: "bg-muted/60 flex items-center justify-center gap-3 border-b px-4 py-2 text-sm", children: [
    /* @__PURE__ */ jsx(ShieldAlert, { className: "text-destructive size-4 shrink-0" }),
    /* @__PURE__ */ jsx("span", { className: "text-foreground", children: t("platform.admin.impersonation.banner") }),
    /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", variant: "outline", className: "h-7", children: /* @__PURE__ */ jsx(Link, { href: route("admin.impersonate.stop"), method: "post", as: "button", children: t("platform.admin.impersonation.stop") }) })
  ] });
}
function AppSidebarLayout({ children, breadcrumbs: breadcrumbs2 = [] }) {
  return /* @__PURE__ */ jsxs(AppShell, { variant: "sidebar", children: [
    /* @__PURE__ */ jsx(AppSidebar, {}),
    /* @__PURE__ */ jsxs(AppContent, { variant: "sidebar", children: [
      /* @__PURE__ */ jsx(ImpersonationBanner, {}),
      /* @__PURE__ */ jsx(AppSidebarHeader, { breadcrumbs: breadcrumbs2 }),
      children
    ] })
  ] });
}
const AppLayout = ({ children, breadcrumbs: breadcrumbs2, ...props }) => /* @__PURE__ */ jsx(AppSidebarLayout, { breadcrumbs: breadcrumbs2, ...props, children });
function AnnouncementsIndex({ announcements }) {
  const t = useTranslator();
  const breadcrumbs2 = [{ title: t("platform.announcements.page_title"), href: "/whats-new" }];
  function handleMarkRead(id) {
    router.post(route("announcements.read", { announcement: id }), {}, { preserveState: true, preserveScroll: true });
  }
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("platform.announcements.page_title") }),
    /* @__PURE__ */ jsx(WhatsNewModal, {}),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-4 md:p-6", children: [
      /* @__PURE__ */ jsx(PageHeader, { title: t("platform.announcements.page_title"), description: t("platform.announcements.page_subtitle") }),
      announcements.data.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground py-12 text-center text-sm", children: t("platform.announcements.empty") }) : /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-4", children: announcements.data.map((announcement) => /* @__PURE__ */ jsx(AnnouncementCard, { announcement, onMarkRead: handleMarkRead }, announcement.id)) }),
      announcements.last_page > 1 && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2", children: [
        announcements.prev_page_url ? /* @__PURE__ */ jsx(
          Link,
          {
            href: announcements.prev_page_url,
            className: "text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline",
            children: "← Previous"
          }
        ) : /* @__PURE__ */ jsx("span", { className: "text-muted-foreground/40 text-sm", children: "← Previous" }),
        /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground text-sm tabular-nums", children: [
          announcements.current_page,
          " / ",
          announcements.last_page
        ] }),
        announcements.next_page_url ? /* @__PURE__ */ jsx(
          Link,
          {
            href: announcements.next_page_url,
            className: "text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline",
            children: "Next →"
          }
        ) : /* @__PURE__ */ jsx("span", { className: "text-muted-foreground/40 text-sm", children: "Next →" })
      ] })
    ] })
  ] });
}
const __vite_glob_0_9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AnnouncementsIndex
}, Symbol.toStringTag, { value: "Module" }));
function FieldGroup({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-slot": "field-group",
      className: cn(
        "group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4",
        className
      ),
      ...props
    }
  );
}
const fieldVariants = cva("group/field flex w-full gap-3 data-[invalid=true]:text-destructive", {
  variants: {
    orientation: {
      vertical: ["flex-col [&>*]:w-full [&>.sr-only]:w-auto"],
      horizontal: [
        "flex-row items-center",
        "[&>[data-slot=field-label]]:flex-auto",
        "has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px"
      ],
      responsive: [
        "flex-col @md/field-group:flex-row @md/field-group:items-center [&>*]:w-full @md/field-group:[&>*]:w-auto [&>.sr-only]:w-auto",
        "@md/field-group:[&>[data-slot=field-label]]:flex-auto",
        "@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px"
      ]
    }
  },
  defaultVariants: {
    orientation: "vertical"
  }
});
function Field({ className, orientation = "vertical", ...props }) {
  return /* @__PURE__ */ jsx("div", { role: "group", "data-slot": "field", "data-orientation": orientation, className: cn(fieldVariants({ orientation }), className), ...props });
}
function FieldLabel({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    Label,
    {
      "data-slot": "field-label",
      className: cn(
        "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4",
        "has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 dark:has-data-[state=checked]:bg-primary/10",
        className
      ),
      ...props
    }
  );
}
function FieldDescription({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "p",
    {
      "data-slot": "field-description",
      className: cn(
        "text-sm leading-normal font-normal text-muted-foreground group-has-[[data-orientation=horizontal]]/field:text-balance",
        "last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5",
        "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className
      ),
      ...props
    }
  );
}
function ConfirmPassword() {
  const { data, setData, post, processing, errors, reset } = useForm({
    password: ""
  });
  const submit = (e) => {
    e.preventDefault();
    post(route("password.confirm"), {
      onFinish: () => reset("password")
    });
  };
  return /* @__PURE__ */ jsxs(
    AuthLayout,
    {
      title: "Confirm your password",
      description: "This is a secure area of the application. Please confirm your password before continuing.",
      children: [
        /* @__PURE__ */ jsx(Head, { title: "Confirm password" }),
        /* @__PURE__ */ jsx("form", { onSubmit: submit, children: /* @__PURE__ */ jsxs(FieldGroup, { children: [
          /* @__PURE__ */ jsxs(Field, { children: [
            /* @__PURE__ */ jsx(FieldLabel, { htmlFor: "password", children: "Password" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "password",
                type: "password",
                name: "password",
                placeholder: "Password",
                autoComplete: "current-password",
                value: data.password,
                autoFocus: true,
                onChange: (e) => setData("password", e.target.value)
              }
            ),
            /* @__PURE__ */ jsx(InputError, { message: errors.password })
          ] }),
          /* @__PURE__ */ jsx(Field, { children: /* @__PURE__ */ jsxs(Button, { type: "submit", disabled: processing, children: [
            processing && /* @__PURE__ */ jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }),
            "Confirm password"
          ] }) })
        ] }) })
      ]
    }
  );
}
const __vite_glob_0_10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ConfirmPassword
}, Symbol.toStringTag, { value: "Module" }));
function ForgotPassword({ status }) {
  const { data, setData, post, processing, errors } = useForm({
    email: ""
  });
  const submit = (e) => {
    e.preventDefault();
    post(route("password.email"));
  };
  return /* @__PURE__ */ jsxs(AuthLayout, { title: "Forgot password", description: "Enter your email to receive a password reset link", children: [
    /* @__PURE__ */ jsx(Head, { title: "Forgot password" }),
    /* @__PURE__ */ jsx("form", { onSubmit: submit, children: /* @__PURE__ */ jsxs(FieldGroup, { children: [
      status && /* @__PURE__ */ jsx("div", { className: "text-success text-center text-sm font-medium", children: status }),
      /* @__PURE__ */ jsxs(Field, { children: [
        /* @__PURE__ */ jsx(FieldLabel, { htmlFor: "email", children: "Email" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "email",
            type: "email",
            name: "email",
            autoComplete: "off",
            value: data.email,
            autoFocus: true,
            onChange: (e) => setData("email", e.target.value),
            placeholder: "m@example.com"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { message: errors.email })
      ] }),
      /* @__PURE__ */ jsx(Field, { children: /* @__PURE__ */ jsxs(Button, { type: "submit", disabled: processing, children: [
        processing && /* @__PURE__ */ jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }),
        "Email password reset link"
      ] }) }),
      /* @__PURE__ */ jsxs(FieldDescription, { className: "text-center", children: [
        "Or, return to ",
        /* @__PURE__ */ jsx(TextLink, { href: route("login"), children: "sign in" })
      ] })
    ] }) })
  ] });
}
const __vite_glob_0_11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ForgotPassword
}, Symbol.toStringTag, { value: "Module" }));
function Login({ status, canResetPassword }) {
  const { name } = usePage().props;
  const { data, setData, post, processing, errors, reset } = useForm({
    email: "",
    password: "",
    remember: false
  });
  const submit = (e) => {
    e.preventDefault();
    post(route("login"), {
      onFinish: () => reset("password")
    });
  };
  return /* @__PURE__ */ jsxs("div", { className: "bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10", children: [
    /* @__PURE__ */ jsx(Head, { title: "Log in" }),
    /* @__PURE__ */ jsx("div", { className: "w-full max-w-sm md:max-w-4xl", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-6", children: [
      /* @__PURE__ */ jsx(Card, { className: "overflow-hidden p-0 shadow-sm", children: /* @__PURE__ */ jsxs(CardContent, { className: "grid p-0 md:grid-cols-2", children: [
        /* @__PURE__ */ jsx("form", { className: "p-6 md:p-8", onSubmit: submit, children: /* @__PURE__ */ jsxs(FieldGroup, { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-2 text-center", children: [
            /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Welcome back" }),
            /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground text-balance", children: [
              "Sign in to your ",
              name,
              " account"
            ] })
          ] }),
          status && /* @__PURE__ */ jsx("div", { className: "text-success text-center text-sm font-medium", children: status }),
          /* @__PURE__ */ jsxs(Field, { children: [
            /* @__PURE__ */ jsx(FieldLabel, { htmlFor: "email", children: "Email" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "email",
                type: "email",
                required: true,
                autoFocus: true,
                tabIndex: 1,
                autoComplete: "email",
                value: data.email,
                onChange: (e) => setData("email", e.target.value),
                placeholder: "m@example.com"
              }
            ),
            /* @__PURE__ */ jsx(InputError, { message: errors.email })
          ] }),
          /* @__PURE__ */ jsxs(Field, { children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
              /* @__PURE__ */ jsx(FieldLabel, { htmlFor: "password", children: "Password" }),
              canResetPassword && /* @__PURE__ */ jsx(TextLink, { href: route("password.request"), className: "ml-auto text-sm", tabIndex: 5, children: "Forgot your password?" })
            ] }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "password",
                type: "password",
                required: true,
                tabIndex: 2,
                autoComplete: "current-password",
                value: data.password,
                onChange: (e) => setData("password", e.target.value),
                placeholder: "Password"
              }
            ),
            /* @__PURE__ */ jsx(InputError, { message: errors.password })
          ] }),
          /* @__PURE__ */ jsxs(Field, { orientation: "horizontal", children: [
            /* @__PURE__ */ jsx(
              Checkbox,
              {
                id: "remember",
                name: "remember",
                tabIndex: 3,
                checked: data.remember,
                onCheckedChange: (checked) => setData("remember", checked === true)
              }
            ),
            /* @__PURE__ */ jsx(FieldLabel, { htmlFor: "remember", className: "font-normal", children: "Remember me" })
          ] }),
          /* @__PURE__ */ jsx(Field, { children: /* @__PURE__ */ jsxs(Button, { type: "submit", tabIndex: 4, disabled: processing, children: [
            processing && /* @__PURE__ */ jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }),
            "Sign in"
          ] }) }),
          /* @__PURE__ */ jsxs(FieldDescription, { className: "text-center", children: [
            "Don't have an account?",
            " ",
            /* @__PURE__ */ jsx(TextLink, { href: route("register"), tabIndex: 5, children: "Sign up" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(AuthBrandPanel, {})
      ] }) }),
      /* @__PURE__ */ jsxs(FieldDescription, { className: "px-6 text-center", children: [
        "By clicking continue, you agree to our ",
        /* @__PURE__ */ jsx("a", { href: "#", children: "Terms of Service" }),
        " and ",
        /* @__PURE__ */ jsx("a", { href: "#", children: "Privacy Policy" }),
        "."
      ] })
    ] }) })
  ] });
}
const __vite_glob_0_12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Login
}, Symbol.toStringTag, { value: "Module" }));
function Register() {
  const { data, setData, post, processing, errors, reset } = useForm({
    name: "",
    email: "",
    password: "",
    password_confirmation: ""
  });
  const submit = (e) => {
    e.preventDefault();
    post(route("register"), {
      onFinish: () => reset("password", "password_confirmation")
    });
  };
  return /* @__PURE__ */ jsxs(AuthLayout, { title: "Create an account", description: "Enter your details below to create your account", children: [
    /* @__PURE__ */ jsx(Head, { title: "Register" }),
    /* @__PURE__ */ jsx("form", { onSubmit: submit, children: /* @__PURE__ */ jsxs(FieldGroup, { children: [
      /* @__PURE__ */ jsxs(Field, { children: [
        /* @__PURE__ */ jsx(FieldLabel, { htmlFor: "name", children: "Name" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "name",
            type: "text",
            required: true,
            autoFocus: true,
            tabIndex: 1,
            autoComplete: "name",
            value: data.name,
            onChange: (e) => setData("name", e.target.value),
            disabled: processing,
            placeholder: "Full name"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { message: errors.name })
      ] }),
      /* @__PURE__ */ jsxs(Field, { children: [
        /* @__PURE__ */ jsx(FieldLabel, { htmlFor: "email", children: "Email" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "email",
            type: "email",
            required: true,
            tabIndex: 2,
            autoComplete: "email",
            value: data.email,
            onChange: (e) => setData("email", e.target.value),
            disabled: processing,
            placeholder: "m@example.com"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { message: errors.email })
      ] }),
      /* @__PURE__ */ jsxs(Field, { children: [
        /* @__PURE__ */ jsx(FieldLabel, { htmlFor: "password", children: "Password" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "password",
            type: "password",
            required: true,
            tabIndex: 3,
            autoComplete: "new-password",
            value: data.password,
            onChange: (e) => setData("password", e.target.value),
            disabled: processing,
            placeholder: "Password"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { message: errors.password })
      ] }),
      /* @__PURE__ */ jsxs(Field, { children: [
        /* @__PURE__ */ jsx(FieldLabel, { htmlFor: "password_confirmation", children: "Confirm password" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "password_confirmation",
            type: "password",
            required: true,
            tabIndex: 4,
            autoComplete: "new-password",
            value: data.password_confirmation,
            onChange: (e) => setData("password_confirmation", e.target.value),
            disabled: processing,
            placeholder: "Confirm password"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { message: errors.password_confirmation })
      ] }),
      /* @__PURE__ */ jsx(Field, { children: /* @__PURE__ */ jsxs(Button, { type: "submit", tabIndex: 5, disabled: processing, children: [
        processing && /* @__PURE__ */ jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }),
        "Create account"
      ] }) }),
      /* @__PURE__ */ jsxs(FieldDescription, { className: "text-center", children: [
        "Already have an account?",
        " ",
        /* @__PURE__ */ jsx(TextLink, { href: route("login"), tabIndex: 6, children: "Sign in" })
      ] })
    ] }) })
  ] });
}
const __vite_glob_0_13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Register
}, Symbol.toStringTag, { value: "Module" }));
function ResetPassword({ token, email }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    token,
    email,
    password: "",
    password_confirmation: ""
  });
  const submit = (e) => {
    e.preventDefault();
    post(route("password.store"), {
      onFinish: () => reset("password", "password_confirmation")
    });
  };
  return /* @__PURE__ */ jsxs(AuthLayout, { title: "Reset password", description: "Please enter your new password below", children: [
    /* @__PURE__ */ jsx(Head, { title: "Reset password" }),
    /* @__PURE__ */ jsx("form", { onSubmit: submit, children: /* @__PURE__ */ jsxs(FieldGroup, { children: [
      /* @__PURE__ */ jsxs(Field, { children: [
        /* @__PURE__ */ jsx(FieldLabel, { htmlFor: "email", children: "Email" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "email",
            type: "email",
            name: "email",
            autoComplete: "email",
            value: data.email,
            readOnly: true,
            onChange: (e) => setData("email", e.target.value)
          }
        ),
        /* @__PURE__ */ jsx(InputError, { message: errors.email })
      ] }),
      /* @__PURE__ */ jsxs(Field, { children: [
        /* @__PURE__ */ jsx(FieldLabel, { htmlFor: "password", children: "Password" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "password",
            type: "password",
            name: "password",
            autoComplete: "new-password",
            value: data.password,
            autoFocus: true,
            onChange: (e) => setData("password", e.target.value),
            placeholder: "Password"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { message: errors.password })
      ] }),
      /* @__PURE__ */ jsxs(Field, { children: [
        /* @__PURE__ */ jsx(FieldLabel, { htmlFor: "password_confirmation", children: "Confirm password" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "password_confirmation",
            type: "password",
            name: "password_confirmation",
            autoComplete: "new-password",
            value: data.password_confirmation,
            onChange: (e) => setData("password_confirmation", e.target.value),
            placeholder: "Confirm password"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { message: errors.password_confirmation })
      ] }),
      /* @__PURE__ */ jsx(Field, { children: /* @__PURE__ */ jsxs(Button, { type: "submit", disabled: processing, children: [
        processing && /* @__PURE__ */ jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }),
        "Reset password"
      ] }) })
    ] }) })
  ] });
}
const __vite_glob_0_14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ResetPassword
}, Symbol.toStringTag, { value: "Module" }));
function VerifyEmail({ status }) {
  const { post, processing } = useForm({});
  const submit = (e) => {
    e.preventDefault();
    post(route("verification.send"));
  };
  return /* @__PURE__ */ jsxs(AuthLayout, { title: "Verify email", description: "Please verify your email address by clicking on the link we just emailed to you.", children: [
    /* @__PURE__ */ jsx(Head, { title: "Email verification" }),
    status === "verification-link-sent" && /* @__PURE__ */ jsx("div", { className: "text-success mb-4 text-center text-sm font-medium", children: "A new verification link has been sent to the email address you provided during registration." }),
    /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "space-y-6 text-center", children: [
      /* @__PURE__ */ jsxs(Button, { disabled: processing, variant: "secondary", children: [
        processing && /* @__PURE__ */ jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }),
        "Resend verification email"
      ] }),
      /* @__PURE__ */ jsx(TextLink, { href: route("logout"), method: "post", className: "mx-auto block text-sm", children: "Log out" })
    ] })
  ] });
}
const __vite_glob_0_15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: VerifyEmail
}, Symbol.toStringTag, { value: "Module" }));
function Switch({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    SwitchPrimitive.Root,
    {
      "data-slot": "switch",
      className: cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsx(
        SwitchPrimitive.Thumb,
        {
          "data-slot": "switch-thumb",
          className: cn(
            "bg-background pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
          )
        }
      )
    }
  );
}
let autoId = 0;
function newNodeId() {
  autoId += 1;
  return `n_${Date.now().toString(36)}_${autoId}`;
}
function graphToFlow(graph, t) {
  const nodes = graph.nodes.map((node, index) => ({
    id: node.id,
    type: "workflowNode",
    // Single top-to-bottom column — WorkflowNodeCard only exposes
    // top(target)/bottom(source) handles, so a vertical default layout
    // avoids a looping bezier before the user repositions anything.
    position: node.position ?? { x: 250, y: index * 160 + 40 },
    data: { nodeType: node.type, config: node.config ?? {}, summary: summarizeNode(node.type, node.config ?? {}, t) }
  }));
  const edges = graph.edges.map((edge, index) => ({
    id: `e_${index}_${edge.from}_${edge.to}`,
    source: edge.from,
    target: edge.to,
    sourceHandle: edge.branch === true ? "true" : edge.branch === false ? "false" : void 0
  }));
  return { nodes, edges };
}
function flowToGraph(nodes, edges) {
  const graphNodes = nodes.map((node) => ({
    id: node.id,
    type: node.data.nodeType,
    config: node.data.config,
    position: node.position
  }));
  const graphEdges = edges.map((edge) => ({
    from: edge.source,
    to: edge.target,
    branch: edge.sourceHandle === "true" ? true : edge.sourceHandle === "false" ? false : null
  }));
  return { nodes: graphNodes, edges: graphEdges };
}
function summarizeNode(type, config, t) {
  switch (type) {
    case "start":
      return config.trigger ? t(`automation.triggers.${config.trigger}`) : "";
    case "condition": {
      const count = Array.isArray(config.conditions) ? config.conditions.length : 0;
      return count > 0 ? t("automation.canvas.condition_count", { count }) : "";
    }
    case "wait":
      return config.amount ? `${config.amount} ${t(`automation.fields.wait_${config.unit ?? "minutes"}`).toLowerCase()}` : "";
    case "end":
      return "";
    case "send_message":
      return typeof config.body === "string" && config.body ? config.body : "";
    case "create_task":
      return typeof config.name === "string" && config.name ? config.name : "";
    case "notify_internal": {
      const count = Array.isArray(config.user_ids) ? config.user_ids.length : 0;
      return count > 0 ? t("automation.canvas.recipient_count", { count }) : "";
    }
    case "tag": {
      const action = t(`automation.fields.tag_${config.action === "detach" ? "detach" : "attach"}`);
      return config.tag ? `${action} "${config.tag}"` : "";
    }
    case "change_lead_stage":
      return typeof config.stage_id === "string" && config.stage_id ? t("automation.canvas.stage_selected") : "";
    default:
      return "";
  }
}
function validateGraphShape(graph) {
  const errors = [];
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const startNodes = graph.nodes.filter((n) => n.type === "start");
  if (startNodes.length !== 1) {
    errors.push("automation.canvas.validation_no_start");
  }
  const startIds = new Set(startNodes.map((n) => n.id));
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      errors.push("automation.canvas.validation_dangling_edge");
    }
    if (startIds.has(edge.to)) {
      errors.push("automation.canvas.validation_start_incoming");
    }
  }
  return [...new Set(errors)];
}
const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ jsx(
    "textarea",
    {
      className: cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      ),
      ref,
      ...props
    }
  );
});
Textarea.displayName = "Textarea";
const PALETTE_NODE_TYPES = [
  "condition",
  "wait",
  "end",
  "send_message",
  "create_task",
  "notify_internal",
  "tag",
  "change_lead_stage"
];
const TRIGGER_KEYS = ["lead_created", "lead_assigned", "lead_stage_changed", "message_received", "manual"];
const CHANNEL_KEYS = ["zalo_personal"];
const CONDITION_OPERATORS = ["equals", "not_equals", "contains", "greater_than", "less_than"];
const CONDITION_FIELD_SUGGESTIONS = ["name", "email", "phone", "company", "lead_value", "stage_id", "pipeline_id", "is_public"];
const TASK_PRIORITIES = [
  { value: 1, key: "low" },
  { value: 2, key: "medium" },
  { value: 3, key: "high" },
  { value: 4, key: "urgent" }
];
const WAIT_UNITS = ["minutes", "hours", "days"];
function defaultConfigFor(nodeType) {
  switch (nodeType) {
    case "condition":
      return { conditions: [] };
    case "wait":
      return { amount: 0, unit: "minutes" };
    case "send_message":
      return { channel: CHANNEL_KEYS[0], body: "" };
    case "create_task":
      return { name: "", priority: 2 };
    case "tag":
      return { action: "attach", tag: "", color: "#64748b" };
    default:
      return {};
  }
}
function InspectorPanel({ node, onChange, onDelete, pipelines, members }) {
  const t = useTranslator();
  if (!node) {
    return /* @__PURE__ */ jsx("div", { className: "w-80 shrink-0 border-l p-4", children: /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: t("automation.canvas.inspector_empty") }) });
  }
  const config = node.data.config;
  const set = (patch) => onChange({ ...config, ...patch });
  return /* @__PURE__ */ jsxs("div", { className: "w-80 shrink-0 space-y-4 overflow-y-auto border-l p-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold", children: t(`automation.node_types.${node.data.nodeType}`) }),
      node.data.nodeType !== "start" && /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "icon", onClick: onDelete, title: t("automation.canvas.delete_node"), children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) })
    ] }),
    node.data.nodeType === "start" && /* @__PURE__ */ jsx(StartFields, { config, set, t }),
    node.data.nodeType === "condition" && /* @__PURE__ */ jsx(ConditionFields, { config, set, t }),
    node.data.nodeType === "wait" && /* @__PURE__ */ jsx(WaitFields, { config, set, t }),
    node.data.nodeType === "send_message" && /* @__PURE__ */ jsx(SendMessageFields, { config, set, t }),
    node.data.nodeType === "create_task" && /* @__PURE__ */ jsx(CreateTaskFields, { config, set, t }),
    node.data.nodeType === "notify_internal" && /* @__PURE__ */ jsx(NotifyInternalFields, { config, set, t, members }),
    node.data.nodeType === "tag" && /* @__PURE__ */ jsx(TagFields, { config, set, t }),
    node.data.nodeType === "change_lead_stage" && /* @__PURE__ */ jsx(ChangeLeadStageFields, { config, set, t, pipelines })
  ] });
}
function StartFields({ config, set, t }) {
  return /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
    /* @__PURE__ */ jsx(Label, { children: t("automation.fields.trigger") }),
    /* @__PURE__ */ jsxs(Select, { value: config.trigger ?? "", onValueChange: (v) => set({ trigger: v }), children: [
      /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
      /* @__PURE__ */ jsx(SelectContent, { children: TRIGGER_KEYS.map((key) => /* @__PURE__ */ jsx(SelectItem, { value: key, children: t(`automation.triggers.${key}`) }, key)) })
    ] })
  ] });
}
function ConditionFields({ config, set, t }) {
  const conditions = Array.isArray(config.conditions) ? config.conditions : [];
  function update(index, patch) {
    const next = conditions.map((c, i) => i === index ? { ...c, ...patch } : c);
    set({ conditions: next });
  }
  function remove(index) {
    set({ conditions: conditions.filter((_, i) => i !== index) });
  }
  function add() {
    set({ conditions: [...conditions, { field: "", operator: "equals", value: "" }] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    conditions.map((condition, index) => /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 rounded-md border p-2", children: [
      /* @__PURE__ */ jsx(
        Input,
        {
          list: "automation-condition-fields",
          placeholder: t("automation.fields.condition_field"),
          value: condition.field ?? "",
          onChange: (e) => update(index, { field: e.target.value })
        }
      ),
      /* @__PURE__ */ jsxs(Select, { value: condition.operator ?? "equals", onValueChange: (v) => update(index, { operator: v }), children: [
        /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsx(SelectContent, { children: CONDITION_OPERATORS.map((op) => /* @__PURE__ */ jsx(SelectItem, { value: op, children: t(`automation.operators.${op}`) }, op)) })
      ] }),
      /* @__PURE__ */ jsx(
        Input,
        {
          placeholder: t("automation.fields.condition_value"),
          value: condition.value ?? "",
          onChange: (e) => update(index, { value: e.target.value })
        }
      ),
      /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => remove(index), children: t("automation.fields.remove_condition") })
    ] }, index)),
    /* @__PURE__ */ jsx("datalist", { id: "automation-condition-fields", children: CONDITION_FIELD_SUGGESTIONS.map((f) => /* @__PURE__ */ jsx("option", { value: f }, f)) }),
    /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: add, children: t("automation.fields.add_condition") })
  ] });
}
function WaitFields({ config, set, t }) {
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsx(Label, { children: t("automation.fields.wait_amount") }),
      /* @__PURE__ */ jsx(Input, { type: "number", min: 0, value: config.amount ?? 0, onChange: (e) => set({ amount: Number(e.target.value) }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsx(Label, { children: t("automation.fields.wait_unit") }),
      /* @__PURE__ */ jsxs(Select, { value: config.unit ?? "minutes", onValueChange: (v) => set({ unit: v }), children: [
        /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsx(SelectContent, { children: WAIT_UNITS.map((unit) => /* @__PURE__ */ jsx(SelectItem, { value: unit, children: t(`automation.fields.wait_${unit}`) }, unit)) })
      ] })
    ] })
  ] });
}
function SendMessageFields({ config, set, t }) {
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsx(Label, { children: t("automation.fields.channel") }),
      /* @__PURE__ */ jsxs(Select, { value: config.channel ?? CHANNEL_KEYS[0], onValueChange: (v) => set({ channel: v }), children: [
        /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsx(SelectContent, { children: CHANNEL_KEYS.map((channel) => /* @__PURE__ */ jsx(SelectItem, { value: channel, children: channel }, channel)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsx(Label, { children: t("automation.fields.message_body") }),
      /* @__PURE__ */ jsx(Textarea, { value: config.body ?? "", onChange: (e) => set({ body: e.target.value }), rows: 4 })
    ] })
  ] });
}
function CreateTaskFields({ config, set, t }) {
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsx(Label, { children: t("automation.fields.task_name") }),
      /* @__PURE__ */ jsx(Input, { value: config.name ?? "", onChange: (e) => set({ name: e.target.value }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsx(Label, { children: t("automation.fields.task_description") }),
      /* @__PURE__ */ jsx(Textarea, { value: config.description ?? "", onChange: (e) => set({ description: e.target.value }), rows: 3 })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsx(Label, { children: t("automation.fields.task_priority") }),
      /* @__PURE__ */ jsxs(Select, { value: String(config.priority ?? 2), onValueChange: (v) => set({ priority: Number(v) }), children: [
        /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsx(SelectContent, { children: TASK_PRIORITIES.map((p) => /* @__PURE__ */ jsx(SelectItem, { value: String(p.value), children: t(`automation.priorities.${p.key}`) }, p.value)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsx(Label, { children: t("automation.fields.task_due_in_days") }),
      /* @__PURE__ */ jsx(
        Input,
        {
          type: "number",
          min: 0,
          value: config.due_in_days ?? "",
          onChange: (e) => set({ due_in_days: e.target.value === "" ? void 0 : Number(e.target.value) })
        }
      )
    ] })
  ] });
}
function NotifyInternalFields({ config, set, t, members }) {
  const userIds = Array.isArray(config.user_ids) ? config.user_ids : [];
  function toggle(id) {
    set({ user_ids: userIds.includes(id) ? userIds.filter((u) => u !== id) : [...userIds, id] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsx(Label, { children: t("automation.fields.notify_recipients") }),
      /* @__PURE__ */ jsx("div", { className: "max-h-40 space-y-1 overflow-y-auto rounded-md border p-2", children: members.map((m) => /* @__PURE__ */ jsxs("label", { className: "flex cursor-pointer items-center gap-2 text-sm", children: [
        /* @__PURE__ */ jsx("input", { type: "checkbox", checked: userIds.includes(m.id), onChange: () => toggle(m.id), className: "rounded" }),
        m.name
      ] }, m.id)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsx(Label, { children: t("automation.fields.notify_message") }),
      /* @__PURE__ */ jsx(Textarea, { value: config.message ?? "", onChange: (e) => set({ message: e.target.value }), rows: 3 })
    ] })
  ] });
}
function TagFields({ config, set, t }) {
  const action = config.action ?? "attach";
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsx(Label, { children: t("automation.fields.tag_action") }),
      /* @__PURE__ */ jsxs(Select, { value: action, onValueChange: (v) => set({ action: v }), children: [
        /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "attach", children: t("automation.fields.tag_attach") }),
          /* @__PURE__ */ jsx(SelectItem, { value: "detach", children: t("automation.fields.tag_detach") })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsx(Label, { children: t("automation.fields.tag_name") }),
      /* @__PURE__ */ jsx(Input, { value: config.tag ?? "", onChange: (e) => set({ tag: e.target.value }) })
    ] }),
    action === "attach" && /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsx(Label, { children: t("automation.fields.tag_color") }),
      /* @__PURE__ */ jsx(Input, { type: "color", value: config.color ?? "#64748b", onChange: (e) => set({ color: e.target.value }) })
    ] })
  ] });
}
function ChangeLeadStageFields({ config, set, t, pipelines }) {
  return /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
    /* @__PURE__ */ jsx(Label, { children: t("automation.fields.pipeline_stage") }),
    /* @__PURE__ */ jsxs(Select, { value: config.stage_id ?? "", onValueChange: (v) => set({ stage_id: v }), children: [
      /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
      /* @__PURE__ */ jsx(SelectContent, { children: pipelines.map((pipeline) => /* @__PURE__ */ jsx(SelectGroupByPipeline, { pipeline }, pipeline.id)) })
    ] })
  ] });
}
function SelectGroupByPipeline({ pipeline }) {
  return /* @__PURE__ */ jsx(Fragment, { children: pipeline.stages.map((stage) => /* @__PURE__ */ jsxs(SelectItem, { value: stage.id, children: [
    pipeline.name,
    " — ",
    stage.name
  ] }, stage.id)) });
}
function Palette() {
  const t = useTranslator();
  function onDragStart(e, nodeType) {
    e.dataTransfer.setData("application/workflow-node-type", nodeType);
    e.dataTransfer.effectAllowed = "move";
  }
  return /* @__PURE__ */ jsxs("div", { className: "w-48 shrink-0 space-y-1 border-r p-3", children: [
    /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mb-2 text-xs font-medium uppercase", children: t("automation.canvas.palette_title") }),
    PALETTE_NODE_TYPES.map((nodeType) => /* @__PURE__ */ jsx(
      "div",
      {
        draggable: true,
        onDragStart: (e) => onDragStart(e, nodeType),
        className: "bg-card cursor-grab rounded-md border px-2 py-1.5 text-xs active:cursor-grabbing",
        children: t(`automation.node_types.${nodeType}`)
      },
      nodeType
    ))
  ] });
}
const NODE_ICON = {
  start: Play,
  condition: GitBranch,
  wait: Hourglass,
  end: CircleCheckBig,
  send_message: MessageSquare,
  create_task: ListTodo,
  notify_internal: Bell,
  tag: Tag,
  change_lead_stage: ArrowRightLeft
};
const NODE_COLOR = {
  start: "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
  condition: "border-amber-400 bg-amber-50 dark:bg-amber-950/40",
  wait: "border-slate-400 bg-slate-50 dark:bg-slate-900/40",
  end: "border-slate-400 bg-slate-50 dark:bg-slate-900/40",
  send_message: "border-blue-400 bg-blue-50 dark:bg-blue-950/40",
  create_task: "border-blue-400 bg-blue-50 dark:bg-blue-950/40",
  notify_internal: "border-blue-400 bg-blue-50 dark:bg-blue-950/40",
  tag: "border-blue-400 bg-blue-50 dark:bg-blue-950/40",
  change_lead_stage: "border-blue-400 bg-blue-50 dark:bg-blue-950/40"
};
function WorkflowNodeCard({ data, selected }) {
  const t = useTranslator();
  const Icon = NODE_ICON[data.nodeType] ?? HelpCircle;
  const color = NODE_COLOR[data.nodeType] ?? "border-red-400 bg-red-50 dark:bg-red-950/40";
  const isCondition = data.nodeType === "condition";
  const isEnd = data.nodeType === "end";
  const isStart = data.nodeType === "start";
  return /* @__PURE__ */ jsxs("div", { className: `min-w-[180px] rounded-lg border-2 px-3 py-2 shadow-sm ${color} ${selected ? "ring-ring ring-2 ring-offset-2" : ""}`, children: [
    !isStart && /* @__PURE__ */ jsx(Handle, { type: "target", position: Position.Top, className: "!bg-muted-foreground !h-2 !w-2" }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm font-medium", children: [
      /* @__PURE__ */ jsx(Icon, { className: "h-4 w-4 shrink-0" }),
      /* @__PURE__ */ jsx("span", { children: t(`automation.node_types.${data.nodeType}`) })
    ] }),
    data.summary && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-1 line-clamp-2 text-xs", children: data.summary }),
    !isEnd && !isCondition && /* @__PURE__ */ jsx(Handle, { type: "source", position: Position.Bottom, className: "!bg-muted-foreground !h-2 !w-2" }),
    isCondition && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(Handle, { id: "true", type: "source", position: Position.Bottom, style: { left: "30%" }, className: "!h-2 !w-2 !bg-emerald-500" }),
      /* @__PURE__ */ jsx(Handle, { id: "false", type: "source", position: Position.Bottom, style: { left: "70%" }, className: "!h-2 !w-2 !bg-red-500" }),
      /* @__PURE__ */ jsxs("div", { className: "text-muted-foreground mt-1 flex justify-between text-[10px]", children: [
        /* @__PURE__ */ jsx("span", { children: t("automation.canvas.branch_true") }),
        /* @__PURE__ */ jsx("span", { children: t("automation.canvas.branch_false") })
      ] })
    ] })
  ] });
}
const nodeTypes = { workflowNode: WorkflowNodeCard };
function WorkflowCanvas(props) {
  return /* @__PURE__ */ jsx(ReactFlowProvider, { children: /* @__PURE__ */ jsx(WorkflowCanvasInner, { ...props }) });
}
function WorkflowCanvasInner({ initialGraph, initialName, initialIsActive, pipelines, members, saving, errors, onSave, headerActions }) {
  var _a;
  const t = useTranslator();
  const { screenToFlowPosition } = useReactFlow();
  const initial = useMemo(() => graphToFlow(initialGraph, t), [initialGraph, t]);
  const [nodes, setNodes, onNodesChangeRaw] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [name, setName] = useState(initialName);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [clientErrors, setClientErrors] = useState([]);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const startNodeId = (_a = nodes.find((n) => n.data.nodeType === "start")) == null ? void 0 : _a.id;
  const onNodesChange = useCallback(
    (changes) => {
      const filtered = changes.filter((change) => !(change.type === "remove" && change.id === startNodeId));
      onNodesChangeRaw(filtered);
    },
    [onNodesChangeRaw, startNodeId]
  );
  const onConnect = useCallback((connection) => setEdges((eds) => addEdge(connection, eds)), [setEdges]);
  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData("application/workflow-node-type");
      if (!nodeType) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const id = newNodeId();
      const config = defaultConfigFor(nodeType);
      setNodes((nds) => [
        ...nds,
        { id, type: "workflowNode", position, data: { nodeType, config, summary: summarizeNode(nodeType, config, t) } }
      ]);
    },
    [screenToFlowPosition, setNodes, t]
  );
  function updateSelectedNodeConfig(config) {
    if (!selectedNodeId) return;
    setNodes(
      (nds) => nds.map((n) => n.id === selectedNodeId ? { ...n, data: { ...n.data, config, summary: summarizeNode(n.data.nodeType, config, t) } } : n)
    );
  }
  function deleteSelectedNode() {
    if (!selectedNodeId || selectedNodeId === startNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }
  function handleSave() {
    const graph = flowToGraph(nodes, edges);
    const graphErrors = validateGraphShape(graph);
    if (graphErrors.length > 0) {
      setClientErrors(graphErrors);
      return;
    }
    setClientErrors([]);
    onSave({ name, is_active: isActive, graph });
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex h-full flex-col", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 border-b p-3", children: [
      /* @__PURE__ */ jsx(
        Input,
        {
          value: name,
          onChange: (e) => setName(e.target.value),
          placeholder: t("automation.canvas.name_placeholder"),
          className: "max-w-xs"
        }
      ),
      errors.name && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.name }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Switch, { checked: isActive, onCheckedChange: setIsActive, id: "workflow-active" }),
        /* @__PURE__ */ jsx(Label, { htmlFor: "workflow-active", children: t("automation.canvas.active_toggle") })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "ml-auto flex items-center gap-2", children: [
        headerActions,
        /* @__PURE__ */ jsx(Button, { type: "button", onClick: handleSave, disabled: saving, children: saving ? t("automation.canvas.saving") : t("automation.canvas.save") })
      ] })
    ] }),
    clientErrors.length > 0 && /* @__PURE__ */ jsx("div", { className: "bg-destructive/10 text-destructive space-y-0.5 border-b px-3 py-2 text-xs", children: clientErrors.map((key) => /* @__PURE__ */ jsx("p", { children: t(key) }, key)) }),
    errors.graph && /* @__PURE__ */ jsx("div", { className: "bg-destructive/10 text-destructive border-b px-3 py-2 text-xs", children: errors.graph }),
    /* @__PURE__ */ jsxs("div", { className: "flex min-h-0 flex-1", children: [
      /* @__PURE__ */ jsx(Palette, {}),
      /* @__PURE__ */ jsx("div", { className: "min-w-0 flex-1", onDrop, onDragOver: (e) => e.preventDefault(), children: /* @__PURE__ */ jsxs(
        ReactFlow,
        {
          nodes,
          edges,
          onNodesChange,
          onEdgesChange,
          onConnect,
          onNodeClick: (_, node) => setSelectedNodeId(node.id),
          onPaneClick: () => setSelectedNodeId(null),
          nodeTypes,
          fitView: true,
          children: [
            /* @__PURE__ */ jsx(Background, {}),
            /* @__PURE__ */ jsx(Controls, {})
          ]
        }
      ) }),
      /* @__PURE__ */ jsx(
        InspectorPanel,
        {
          node: selectedNode,
          onChange: updateSelectedNodeConfig,
          onDelete: deleteSelectedNode,
          pipelines,
          members
        }
      )
    ] })
  ] });
}
const DEFAULT_GRAPH = {
  nodes: [
    { id: "n_start", type: "start", config: { trigger: "lead_created" } },
    { id: "n_end", type: "end", config: {} }
  ],
  edges: [{ from: "n_start", to: "n_end", branch: null }]
};
function AutomationCreate({ pipelines, members }) {
  const t = useTranslator();
  const breadcrumbs2 = [
    { title: t("automation.title.index"), href: route("automation.workflows.index") },
    { title: t("automation.title.create"), href: route("automation.workflows.create") }
  ];
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  function handleSave(data) {
    router.post(route("automation.workflows.store"), data, {
      onStart: () => setProcessing(true),
      onError: (e) => setErrors(e),
      onFinish: () => setProcessing(false)
    });
  }
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("automation.title.create") }),
    /* @__PURE__ */ jsx("div", { className: "flex min-h-0 flex-1 flex-col", children: /* @__PURE__ */ jsx(
      WorkflowCanvas,
      {
        initialGraph: DEFAULT_GRAPH,
        initialName: "",
        initialIsActive: false,
        pipelines,
        members,
        saving: processing,
        errors,
        onSave: handleSave
      }
    ) })
  ] });
}
const __vite_glob_0_16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AutomationCreate
}, Symbol.toStringTag, { value: "Module" }));
function AutomationIndex({ workflows }) {
  const t = useTranslator();
  const breadcrumbs2 = [{ title: t("automation.title.index"), href: route("automation.workflows.index") }];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("automation.title.index") }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-4 md:p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
        /* @__PURE__ */ jsx(PageHeader, { title: t("automation.title.index") }),
        /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", children: /* @__PURE__ */ jsxs(Link, { href: route("automation.workflows.create"), children: [
          /* @__PURE__ */ jsx(Plus, { className: "mr-1 h-4 w-4" }),
          t("automation.index.create_button")
        ] }) })
      ] }),
      workflows.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "text-muted-foreground flex flex-col items-center gap-2 py-16", children: [
        /* @__PURE__ */ jsx(GitBranch, { className: "h-10 w-10 opacity-30" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm", children: t("automation.index.empty") })
      ] }) : /* @__PURE__ */ jsx("div", { className: "rounded-md border", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-muted/30 border-b text-left", children: [
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: t("automation.index.column_name") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: t("automation.index.column_status") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: t("automation.index.column_updated") })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: workflows.map((workflow) => /* @__PURE__ */ jsxs("tr", { className: "hover:bg-muted/20 border-b last:border-0", children: [
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx(
            Link,
            {
              href: route("automation.workflows.show", workflow.id),
              className: "font-medium underline-offset-2 hover:underline",
              children: workflow.name
            }
          ) }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx(Badge, { variant: workflow.is_active ? "default" : "secondary", children: workflow.is_active ? t("automation.index.status_active") : t("automation.index.status_inactive") }) }),
          /* @__PURE__ */ jsx("td", { className: "text-muted-foreground px-4 py-3", children: new Date(workflow.updated_at).toLocaleString() })
        ] }, workflow.id)) })
      ] }) })
    ] })
  ] });
}
const __vite_glob_0_17 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AutomationIndex
}, Symbol.toStringTag, { value: "Module" }));
const SUBJECT_TYPES = ["lead", "contact", "conversation"];
function EnrollDialog({ enrollRoute }) {
  const t = useTranslator();
  const [open, setOpen] = useState(false);
  const { data, setData, post, processing, errors, reset } = useForm({ subject_type: "lead", subject_id: "" });
  function submit(e) {
    e.preventDefault();
    post(enrollRoute, {
      preserveScroll: true,
      onSuccess: () => {
        setOpen(false);
        reset();
      }
    });
  }
  return /* @__PURE__ */ jsxs(Dialog, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", children: t("automation.canvas.run_manually") }) }),
    /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-sm", children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: t("automation.enroll.title") }) }),
      /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { children: t("automation.enroll.subject_type") }),
          /* @__PURE__ */ jsxs(Select, { value: data.subject_type, onValueChange: (v) => setData("subject_type", v), children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsx(SelectContent, { children: SUBJECT_TYPES.map((type) => /* @__PURE__ */ jsx(SelectItem, { value: type, children: type }, type)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { children: t("automation.enroll.subject_id") }),
          /* @__PURE__ */ jsx(Input, { value: data.subject_id, onChange: (e) => setData("subject_id", e.target.value), placeholder: "uuid" }),
          errors.subject_id && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.subject_id })
        ] }),
        /* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx(Button, { type: "submit", disabled: processing, children: t("automation.enroll.submit") }) })
      ] })
    ] })
  ] });
}
function AutomationShow({ workflow, pipelines, members }) {
  const t = useTranslator();
  const breadcrumbs2 = [
    { title: t("automation.title.index"), href: route("automation.workflows.index") },
    { title: workflow.name, href: route("automation.workflows.show", workflow.id) }
  ];
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  function handleSave(data) {
    router.put(route("automation.workflows.update", workflow.id), data, {
      preserveScroll: true,
      onStart: () => setProcessing(true),
      onError: (e) => setErrors(e),
      onFinish: () => setProcessing(false)
    });
  }
  function handleDelete() {
    if (!confirm(t("automation.canvas.delete_confirm"))) return;
    router.delete(route("automation.workflows.destroy", workflow.id));
  }
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: workflow.name }),
    /* @__PURE__ */ jsx("div", { className: "flex min-h-0 flex-1 flex-col", children: /* @__PURE__ */ jsx(
      WorkflowCanvas,
      {
        initialGraph: workflow.graph,
        initialName: workflow.name,
        initialIsActive: workflow.is_active,
        pipelines,
        members,
        saving: processing,
        errors,
        onSave: handleSave,
        headerActions: /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(EnrollDialog, { enrollRoute: route("automation.workflows.enroll", workflow.id) }),
          /* @__PURE__ */ jsx(Button, { type: "button", variant: "destructive", size: "icon", onClick: handleDelete, title: t("automation.canvas.delete"), children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) })
        ] })
      }
    ) })
  ] });
}
const __vite_glob_0_18 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AutomationShow
}, Symbol.toStringTag, { value: "Module" }));
function AdminWorkspacePlans({ workspace, items, channel_usage }) {
  const grant = (itemCode) => {
    router.post(`/admin/workspaces/${workspace.id}/plans`, { item_code: itemCode });
  };
  const revoke = (itemCode) => {
    router.delete(`/admin/workspaces/${workspace.id}/plans`, { data: { item_code: itemCode } });
  };
  return /* @__PURE__ */ jsxs(
    AdminLayout,
    {
      breadcrumbs: [
        { title: "Workspaces", href: "/admin/workspaces" },
        { title: workspace.name, href: `/admin/workspaces/${workspace.id}` },
        { title: "Quản lý gói", href: `/admin/workspaces/${workspace.id}/plans` }
      ],
      children: [
        /* @__PURE__ */ jsx(Head, { title: `Gói — ${workspace.name}` }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-6", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-semibold", children: [
              "Quản lý gói — ",
              workspace.name
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-1 text-sm", children: workspace.slug })
          ] }),
          Object.keys(channel_usage).length > 0 && /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { className: "mb-2 text-base font-medium", children: "Channel usage tháng này" }),
            /* @__PURE__ */ jsx("div", { className: "flex gap-4", children: Object.entries(channel_usage).map(([channel, count]) => /* @__PURE__ */ jsxs("div", { className: "bg-muted rounded-lg px-4 py-2 text-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: channel }),
              ": ",
              count,
              " hội thoại"
            ] }, channel)) })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "bg-card rounded-xl border shadow-sm", children: /* @__PURE__ */ jsxs(Table, { children: [
            /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableHead, { children: "Tên gói" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Code" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Loại" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Giá" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Flags" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Trạng thái" }),
              /* @__PURE__ */ jsx(TableHead, { className: "text-right" })
            ] }) }),
            /* @__PURE__ */ jsxs(TableBody, { children: [
              items.length === 0 && /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 7, className: "text-muted-foreground py-8 text-center", children: "Không có gói nào." }) }),
              items.map((item) => /* @__PURE__ */ jsxs(TableRow, { children: [
                /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: item.name }),
                /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground font-mono text-xs", children: item.code }),
                /* @__PURE__ */ jsx(TableCell, { children: item.type }),
                /* @__PURE__ */ jsx(TableCell, { className: "tabular-nums", children: item.price_cents === 0 ? "Miễn phí" : `${item.price_cents.toLocaleString()} ${item.currency}` }),
                /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1", children: item.flags.map((flag) => /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "text-xs", children: flag }, flag)) }) }),
                /* @__PURE__ */ jsx(TableCell, { children: item.active ? /* @__PURE__ */ jsx(Badge, { variant: "default", children: "Đang dùng" }) : /* @__PURE__ */ jsx(Badge, { variant: "outline", children: "Chưa cấp" }) }),
                /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: item.active ? /* @__PURE__ */ jsx(Button, { size: "sm", variant: "destructive", onClick: () => revoke(item.code), children: "Thu hồi" }) : /* @__PURE__ */ jsx(Button, { size: "sm", variant: "default", onClick: () => grant(item.code), children: "Cấp gói" }) })
              ] }, item.id))
            ] })
          ] }) })
        ] })
      ]
    }
  );
}
const __vite_glob_0_19 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminWorkspacePlans
}, Symbol.toStringTag, { value: "Module" }));
function AddressFields({ prefix, data, errors = {}, onChange, onCopyFromBilling }) {
  const t = useTranslator();
  const label = (field) => t(`clients.address.${field}`) ?? field;
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("h4", { className: "text-sm font-medium", children: t(`clients.address.${prefix}`) ?? prefix }),
      prefix === "shipping" && onCopyFromBilling && /* @__PURE__ */ jsxs(Button, { type: "button", variant: "ghost", size: "sm", onClick: onCopyFromBilling, className: "h-7 gap-1 text-xs", children: [
        /* @__PURE__ */ jsx(Copy, { className: "h-3 w-3" }),
        t("clients.address.copy_from_billing") ?? "Copy from billing"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: `${prefix}_street`, children: label("street") }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: `${prefix}_street`,
            value: data.street,
            onChange: (e) => onChange(`${prefix}_street`, e.target.value),
            placeholder: label("street")
          }
        ),
        errors.street && /* @__PURE__ */ jsx("p", { className: "text-destructive mt-1 text-xs", children: errors.street })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: `${prefix}_city`, children: label("city") }),
          /* @__PURE__ */ jsx(Input, { id: `${prefix}_city`, value: data.city, onChange: (e) => onChange(`${prefix}_city`, e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: `${prefix}_state`, children: label("state") }),
          /* @__PURE__ */ jsx(Input, { id: `${prefix}_state`, value: data.state, onChange: (e) => onChange(`${prefix}_state`, e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: `${prefix}_zip`, children: label("zip") }),
          /* @__PURE__ */ jsx(Input, { id: `${prefix}_zip`, value: data.zip, onChange: (e) => onChange(`${prefix}_zip`, e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: `${prefix}_country`, children: label("country") }),
          /* @__PURE__ */ jsx(Input, { id: `${prefix}_country`, value: data.country, onChange: (e) => onChange(`${prefix}_country`, e.target.value) })
        ] })
      ] })
    ] })
  ] });
}
function Popover({ ...props }) {
  return /* @__PURE__ */ jsx(PopoverPrimitive.Root, { "data-slot": "popover", ...props });
}
function PopoverTrigger({ ...props }) {
  return /* @__PURE__ */ jsx(PopoverPrimitive.Trigger, { "data-slot": "popover-trigger", ...props });
}
function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}) {
  return /* @__PURE__ */ jsx(PopoverPrimitive.Portal, { children: /* @__PURE__ */ jsx(
    PopoverPrimitive.Content,
    {
      "data-slot": "popover-content",
      align,
      sideOffset,
      className: cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
        className
      ),
      ...props
    }
  ) });
}
function GroupSelector({ groups, selected, onChange }) {
  const t = useTranslator();
  function toggle(id) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }
  function remove(id) {
    onChange(selected.filter((s) => s !== id));
  }
  const selectedGroups = groups.filter((g) => selected.includes(g.id));
  return /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1", children: selectedGroups.map((g) => /* @__PURE__ */ jsxs(Badge, { variant: "secondary", className: "gap-1", children: [
      g.name,
      /* @__PURE__ */ jsx("button", { type: "button", onClick: () => remove(g.id), className: "hover:text-destructive ml-0.5", children: /* @__PURE__ */ jsx(X, { className: "h-3 w-3" }) })
    ] }, g.id)) }),
    /* @__PURE__ */ jsxs(Popover, { children: [
      /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { type: "button", variant: "outline", size: "sm", className: "h-8 gap-1", children: [
        t("clients.fields.groups") ?? "Groups",
        /* @__PURE__ */ jsx(ChevronDown, { className: "h-3 w-3" })
      ] }) }),
      /* @__PURE__ */ jsx(PopoverContent, { className: "w-56 p-2", align: "start", children: groups.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground px-2 py-1 text-sm", children: t("clients.group.title") ?? "No groups" }) : groups.map((group) => /* @__PURE__ */ jsxs("div", { className: "hover:bg-accent flex items-center gap-2 rounded px-2 py-1", children: [
        /* @__PURE__ */ jsx(Checkbox, { id: `group-${group.id}`, checked: selected.includes(group.id), onCheckedChange: () => toggle(group.id) }),
        /* @__PURE__ */ jsx(Label, { htmlFor: `group-${group.id}`, className: "cursor-pointer font-normal", children: group.name })
      ] }, group.id)) })
    ] })
  ] });
}
function QuickCreateLookup({ storeRoute, triggerLabel, dialogTitle, placeholder, onCreated }) {
  const t = useTranslator();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  function submit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    router.post(
      storeRoute,
      { name: trimmed },
      {
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
          onCreated(trimmed);
          setName("");
          setOpen(false);
        },
        onFinish: () => setSaving(false)
      }
    );
  }
  return /* @__PURE__ */ jsxs(Dialog, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { type: "button", variant: "outline", size: "sm", className: "h-8 gap-1", children: [
      /* @__PURE__ */ jsx(Plus, { className: "h-3 w-3" }),
      triggerLabel
    ] }) }),
    /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-sm", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: dialogTitle }),
        /* @__PURE__ */ jsx(DialogDescription, { children: t("platform.quick_create.subtitle") ?? "Create without leaving this form." })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "quick-create-name", children: t("platform.quick_create.name") ?? "Name" }),
          /* @__PURE__ */ jsx(Input, { id: "quick-create-name", value: name, onChange: (e) => setName(e.target.value), placeholder, autoFocus: true })
        ] }),
        /* @__PURE__ */ jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", onClick: () => setOpen(false), children: t("platform.quick_create.cancel") ?? "Cancel" }),
          /* @__PURE__ */ jsx(Button, { type: "submit", disabled: saving || !name.trim(), children: t("platform.quick_create.save") ?? "Save" })
        ] })
      ] })
    ] })
  ] });
}
function CustomFieldInput({ definition, value, error, onChange, disabled = false }) {
  const t = useTranslator();
  const label = /* @__PURE__ */ jsxs(Label, { className: "text-sm font-medium", children: [
    definition.name,
    definition.required && /* @__PURE__ */ jsx("span", { className: "text-destructive ml-1", children: "*" })
  ] });
  const renderInput = () => {
    switch (definition.field_type) {
      case "input":
        return /* @__PURE__ */ jsx(
          Input,
          {
            type: "text",
            value: value ?? "",
            onChange: (e) => onChange(definition.slug, e.target.value),
            disabled,
            placeholder: definition.name
          }
        );
      case "number":
        return /* @__PURE__ */ jsx(
          Input,
          {
            type: "number",
            value: value ?? "",
            onChange: (e) => onChange(definition.slug, e.target.value === "" ? null : Number(e.target.value)),
            disabled
          }
        );
      case "textarea":
        return /* @__PURE__ */ jsx(
          Textarea,
          {
            value: value ?? "",
            onChange: (e) => onChange(definition.slug, e.target.value),
            disabled,
            rows: 3
          }
        );
      case "select": {
        const selectVal = value ?? "";
        return /* @__PURE__ */ jsxs(Select, { value: selectVal, onValueChange: (v) => onChange(definition.slug, v), disabled, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: t("custom_fields.fields.options") }) }),
          /* @__PURE__ */ jsx(SelectContent, { children: (definition.options ?? []).map((opt) => /* @__PURE__ */ jsx(SelectItem, { value: opt, children: opt }, opt)) })
        ] });
      }
      case "multiselect": {
        const multiVal = value ?? [];
        return /* @__PURE__ */ jsx("div", { className: "space-y-2", children: (definition.options ?? []).map((opt) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(
            Checkbox,
            {
              id: `${definition.slug}-${opt}`,
              checked: multiVal.includes(opt),
              disabled,
              onCheckedChange: (checked) => {
                const next = checked ? [...multiVal, opt] : multiVal.filter((v) => v !== opt);
                onChange(definition.slug, next);
              }
            }
          ),
          /* @__PURE__ */ jsx(Label, { htmlFor: `${definition.slug}-${opt}`, className: "font-normal", children: opt })
        ] }, opt)) });
      }
      case "checkbox": {
        const checkVal = value ?? [];
        return /* @__PURE__ */ jsx("div", { className: "space-y-2", children: (definition.options ?? []).map((opt) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(
            Checkbox,
            {
              id: `${definition.slug}-${opt}`,
              checked: checkVal.includes(opt),
              disabled,
              onCheckedChange: (checked) => {
                const next = checked ? [...checkVal, opt] : checkVal.filter((v) => v !== opt);
                onChange(definition.slug, next);
              }
            }
          ),
          /* @__PURE__ */ jsx(Label, { htmlFor: `${definition.slug}-${opt}`, className: "font-normal", children: opt })
        ] }, opt)) });
      }
      case "date":
        return /* @__PURE__ */ jsx(
          Input,
          {
            type: "date",
            value: value ?? "",
            onChange: (e) => onChange(definition.slug, e.target.value || null),
            disabled
          }
        );
      case "datetime":
        return /* @__PURE__ */ jsx(
          Input,
          {
            type: "datetime-local",
            value: (value ?? "").replace(" ", "T").substring(0, 16),
            onChange: (e) => {
              const raw = e.target.value;
              onChange(definition.slug, raw ? raw.replace("T", " ") : null);
            },
            disabled
          }
        );
      case "color":
        return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "color",
              value: value ?? "#000000",
              onChange: (e) => onChange(definition.slug, e.target.value.toUpperCase()),
              disabled,
              className: "h-10 w-14 cursor-pointer p-1"
            }
          ),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "text",
              value: value ?? "",
              onChange: (e) => onChange(definition.slug, e.target.value),
              disabled,
              placeholder: "#FF5733",
              className: "flex-1",
              maxLength: 7
            }
          )
        ] });
      case "link": {
        const linkVal = value ?? {};
        return /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "url",
              value: linkVal.url ?? "",
              onChange: (e) => onChange(definition.slug, { ...linkVal, url: e.target.value }),
              disabled,
              placeholder: t("custom_fields.fields.url")
            }
          ),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "text",
              value: linkVal.text ?? "",
              onChange: (e) => onChange(definition.slug, { ...linkVal, text: e.target.value }),
              disabled,
              placeholder: t("custom_fields.fields.link_text")
            }
          )
        ] });
      }
      default:
        return null;
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
    label,
    renderInput(),
    error && /* @__PURE__ */ jsx("p", { className: "text-destructive text-sm", children: error })
  ] });
}
function CustomFieldsSection({ definitions, values, errors = {}, onChange, disabled = false }) {
  const t = useTranslator();
  if (definitions.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm font-medium tracking-wide uppercase", children: t("custom_fields.title") }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-12 gap-4", children: definitions.map((definition) => /* @__PURE__ */ jsx(
      "div",
      {
        className: `col-span-12 lg:col-span-${definition.bs_column}`,
        children: /* @__PURE__ */ jsx(
          CustomFieldInput,
          {
            definition,
            value: values[definition.slug] ?? null,
            error: errors[definition.slug],
            onChange,
            disabled: disabled || definition.disallow_client_edit
          }
        )
      },
      definition.slug
    )) })
  ] });
}
function ClientForm({ client, groups, clientFieldDefs, submitRoute, method = "post" }) {
  const t = useTranslator();
  const { data, setData, post, put, processing, errors } = useForm({
    name: (client == null ? void 0 : client.name) ?? "",
    vat: (client == null ? void 0 : client.vat) ?? "",
    phone: (client == null ? void 0 : client.phone) ?? "",
    website: (client == null ? void 0 : client.website) ?? "",
    currency: (client == null ? void 0 : client.currency) ?? "VND",
    default_language: (client == null ? void 0 : client.default_language) ?? "vi",
    billing_street: (client == null ? void 0 : client.billing_street) ?? "",
    billing_city: (client == null ? void 0 : client.billing_city) ?? "",
    billing_state: (client == null ? void 0 : client.billing_state) ?? "",
    billing_zip: (client == null ? void 0 : client.billing_zip) ?? "",
    billing_country: (client == null ? void 0 : client.billing_country) ?? "",
    shipping_street: (client == null ? void 0 : client.shipping_street) ?? "",
    shipping_city: (client == null ? void 0 : client.shipping_city) ?? "",
    shipping_state: (client == null ? void 0 : client.shipping_state) ?? "",
    shipping_zip: (client == null ? void 0 : client.shipping_zip) ?? "",
    shipping_country: (client == null ? void 0 : client.shipping_country) ?? "",
    groups: ((client == null ? void 0 : client.groups) ?? []).map((g) => g.id),
    custom_fields: (client == null ? void 0 : client.custom_fields) ?? {}
  });
  const [pendingGroupName, setPendingGroupName] = useState(null);
  useEffect(() => {
    if (!pendingGroupName) return;
    const created = groups.find((g) => g.name === pendingGroupName);
    if (!created) return;
    setData((prev) => prev.groups.includes(created.id) ? prev : { ...prev, groups: [...prev.groups, created.id] });
    setPendingGroupName(null);
  }, [groups, pendingGroupName, setData]);
  function handleSubmit(e) {
    e.preventDefault();
    if (method === "put") {
      put(submitRoute);
    } else {
      post(submitRoute);
    }
  }
  function copyBillingToShipping() {
    setData((prev) => ({
      ...prev,
      shipping_street: prev.billing_street,
      shipping_city: prev.billing_city,
      shipping_state: prev.billing_state,
      shipping_zip: prev.billing_zip,
      shipping_country: prev.billing_country
    }));
  }
  function setAddressField(field, value) {
    setData((prev) => ({ ...prev, [field]: value }));
  }
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "sm:col-span-2", children: [
        /* @__PURE__ */ jsxs(Label, { htmlFor: "name", children: [
          t("clients.fields.name"),
          " *"
        ] }),
        /* @__PURE__ */ jsx(Input, { id: "name", value: data.name, onChange: (e) => setData("name", e.target.value), required: true }),
        errors.name && /* @__PURE__ */ jsx("p", { className: "text-destructive mt-1 text-xs", children: errors.name })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "vat", children: t("clients.fields.vat") }),
        /* @__PURE__ */ jsx(Input, { id: "vat", value: data.vat, onChange: (e) => setData("vat", e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "phone", children: t("clients.fields.phone") }),
        /* @__PURE__ */ jsx(Input, { id: "phone", value: data.phone, onChange: (e) => setData("phone", e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "sm:col-span-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "website", children: t("clients.fields.website") }),
        /* @__PURE__ */ jsx(Input, { id: "website", type: "url", value: data.website, onChange: (e) => setData("website", e.target.value), placeholder: "https://" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "currency", children: t("clients.fields.currency") }),
        /* @__PURE__ */ jsxs(Select, { value: data.currency, onValueChange: (v) => setData("currency", v), children: [
          /* @__PURE__ */ jsx(SelectTrigger, { id: "currency", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "VND", children: "VND" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "USD", children: "USD" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "EUR", children: "EUR" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "JPY", children: "JPY" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "GBP", children: "GBP" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "AUD", children: "AUD" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "SGD", children: "SGD" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "CNY", children: "CNY" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "default_language", children: t("clients.fields.default_language") }),
        /* @__PURE__ */ jsxs(Select, { value: data.default_language, onValueChange: (v) => setData("default_language", v), children: [
          /* @__PURE__ */ jsx(SelectTrigger, { id: "default_language", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "vi", children: "Tiếng Việt" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "en", children: "English" })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Label, { children: t("clients.fields.groups") }),
      /* @__PURE__ */ jsxs("div", { className: "mt-1 flex flex-wrap items-start gap-2", children: [
        /* @__PURE__ */ jsx(GroupSelector, { groups, selected: data.groups, onChange: (ids) => setData("groups", ids) }),
        /* @__PURE__ */ jsx(
          QuickCreateLookup,
          {
            storeRoute: route("client-groups.store"),
            triggerLabel: t("platform.quick_create.new_group") ?? "New group",
            dialogTitle: t("platform.quick_create.new_group") ?? "New group",
            placeholder: t("clients.fields.groups") ?? "Group",
            onCreated: (nm) => setPendingGroupName(nm)
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx(Separator, {}),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-6 sm:grid-cols-2", children: [
      /* @__PURE__ */ jsx(
        AddressFields,
        {
          prefix: "billing",
          data: {
            street: data.billing_street,
            city: data.billing_city,
            state: data.billing_state,
            zip: data.billing_zip,
            country: data.billing_country
          },
          onChange: setAddressField
        }
      ),
      /* @__PURE__ */ jsx(
        AddressFields,
        {
          prefix: "shipping",
          data: {
            street: data.shipping_street,
            city: data.shipping_city,
            state: data.shipping_state,
            zip: data.shipping_zip,
            country: data.shipping_country
          },
          onChange: setAddressField,
          onCopyFromBilling: copyBillingToShipping
        }
      )
    ] }),
    clientFieldDefs.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(Separator, {}),
      /* @__PURE__ */ jsx(
        CustomFieldsSection,
        {
          definitions: clientFieldDefs,
          values: data.custom_fields,
          errors,
          onChange: (slug, value) => setData("custom_fields", { ...data.custom_fields, [slug]: value })
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2", children: [
      /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", onClick: () => history.back(), children: t("clients.actions.cancel") }),
      /* @__PURE__ */ jsx(Button, { type: "submit", disabled: processing, children: t("clients.actions.save") })
    ] })
  ] });
}
function ClientCreate({ groups, clientFieldDefs }) {
  const t = useTranslator();
  const breadcrumbs2 = [
    { title: t("clients.title.index") ?? "Clients", href: route("clients.index") },
    { title: t("clients.title.create") ?? "Add Client", href: route("clients.create") }
  ];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("clients.title.create") ?? "Add Client" }),
    /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl p-4 md:p-6", children: [
      /* @__PURE__ */ jsx(PageHeader, { title: t("clients.title.create") ?? "Add Client", className: "mb-6" }),
      /* @__PURE__ */ jsx(ClientForm, { groups, clientFieldDefs, submitRoute: route("clients.store"), method: "post" })
    ] })
  ] });
}
const __vite_glob_0_20 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ClientCreate
}, Symbol.toStringTag, { value: "Module" }));
function ClientEdit({ client, groups, clientFieldDefs }) {
  const t = useTranslator();
  const breadcrumbs2 = [
    { title: t("clients.title.index") ?? "Clients", href: route("clients.index") },
    { title: client.name, href: route("clients.show", { client: client.id }) },
    { title: t("clients.title.edit") ?? "Edit", href: route("clients.edit", { client: client.id }) }
  ];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: `${t("clients.title.edit")} — ${client.name}` }),
    /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl p-4 md:p-6", children: [
      /* @__PURE__ */ jsx(PageHeader, { title: `${t("clients.title.edit") ?? "Edit"}: ${client.name}`, className: "mb-6" }),
      /* @__PURE__ */ jsx(
        ClientForm,
        {
          client,
          groups,
          clientFieldDefs,
          submitRoute: route("clients.update", { client: client.id }),
          method: "put"
        }
      )
    ] })
  ] });
}
const __vite_glob_0_21 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ClientEdit
}, Symbol.toStringTag, { value: "Module" }));
function ClientGroups({ groups }) {
  const t = useTranslator();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const breadcrumbs2 = [
    { title: t("clients.title.index") ?? "Clients", href: route("clients.index") },
    { title: t("clients.title.groups") ?? "Groups", href: route("client-groups.index") }
  ];
  const { data, setData, post, put, processing, errors, reset } = useForm({
    name: "",
    slug: ""
  });
  function openAdd() {
    reset();
    setEditing(null);
    setOpen(true);
  }
  function openEdit(group) {
    setData({ name: group.name, slug: group.slug });
    setEditing(group);
    setOpen(true);
  }
  function handleSubmit(e) {
    e.preventDefault();
    if (editing) {
      put(route("client-groups.update", { client_group: editing.id }), { onSuccess: () => setOpen(false) });
    } else {
      post(route("client-groups.store"), { onSuccess: () => setOpen(false) });
    }
  }
  function handleDelete(group) {
    if (!confirm(t("clients.group.delete_confirm") ?? "Delete this group?")) return;
    router.delete(route("client-groups.destroy", { client_group: group.id }));
  }
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("clients.title.groups") ?? "Client Groups" }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-4 md:p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
        /* @__PURE__ */ jsx(PageHeader, { title: t("clients.title.groups") ?? "Client Groups" }),
        /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: openAdd, children: [
          /* @__PURE__ */ jsx(Plus, { className: "mr-1 h-4 w-4" }),
          t("clients.group.add") ?? "Add Group"
        ] })
      ] }),
      groups.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground py-16 text-center text-sm", children: t("clients.group.empty") }) : /* @__PURE__ */ jsx("div", { className: "rounded-md border", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-muted/30 border-b text-left", children: [
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: t("clients.group.name") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: t("clients.group.slug") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "#" }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: groups.map((group) => /* @__PURE__ */ jsxs("tr", { className: "hover:bg-muted/20 border-b last:border-0", children: [
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3 font-medium", children: group.name }),
          /* @__PURE__ */ jsx("td", { className: "text-muted-foreground px-4 py-3", children: group.slug }),
          /* @__PURE__ */ jsx("td", { className: "text-muted-foreground px-4 py-3", children: group.clients_count }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-1", children: [
            /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7", onClick: () => openEdit(group), children: /* @__PURE__ */ jsx(Pencil, { className: "h-3.5 w-3.5" }) }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "ghost",
                size: "icon",
                className: "text-destructive hover:text-destructive h-7 w-7",
                onClick: () => handleDelete(group),
                children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" })
              }
            )
          ] }) })
        ] }, group.id)) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-sm", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: editing ? t("clients.group.edit") : t("clients.group.add") }),
        /* @__PURE__ */ jsx(DialogDescription, { children: t("clients.group.dialog_description") ?? "Enter the group details below." })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs(Label, { htmlFor: "group_name", children: [
            t("clients.group.name"),
            " *"
          ] }),
          /* @__PURE__ */ jsx(Input, { id: "group_name", value: data.name, onChange: (e) => setData("name", e.target.value), required: true }),
          errors.name && /* @__PURE__ */ jsx("p", { className: "text-destructive mt-1 text-xs", children: errors.name })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "group_slug", children: t("clients.group.slug") }),
          /* @__PURE__ */ jsx(Input, { id: "group_slug", value: data.slug, onChange: (e) => setData("slug", e.target.value), placeholder: "auto" }),
          errors.slug && /* @__PURE__ */ jsx("p", { className: "text-destructive mt-1 text-xs", children: errors.slug })
        ] }),
        /* @__PURE__ */ jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", onClick: () => setOpen(false), children: t("clients.actions.cancel") }),
          /* @__PURE__ */ jsx(Button, { type: "submit", disabled: processing, children: t("clients.actions.save") })
        ] })
      ] })
    ] }) })
  ] });
}
const __vite_glob_0_22 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ClientGroups
}, Symbol.toStringTag, { value: "Module" }));
function ClientsIndex({ clients, groups, filters }) {
  var _a;
  const t = useTranslator();
  const [search, setSearch] = useState(filters.search ?? "");
  const breadcrumbs2 = [{ title: t("clients.title.index") ?? "Clients", href: route("clients.index") }];
  const applyFilter = useCallback(
    (params) => {
      router.get(route("clients.index"), { ...filters, ...params }, { preserveState: true, replace: true });
    },
    [filters]
  );
  function handleSearch(e) {
    e.preventDefault();
    applyFilter({ search });
  }
  function handleGroupChange(value) {
    applyFilter({ group: value === "all" ? "" : value });
  }
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("clients.title.index") ?? "Clients" }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-4 md:p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
        /* @__PURE__ */ jsx(
          PageHeader,
          {
            title: t("clients.title.index") ?? "Clients",
            description: `${clients.total} ${((_a = t("clients.title.index")) == null ? void 0 : _a.toLowerCase()) ?? "clients"}`
          }
        ),
        /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", children: /* @__PURE__ */ jsxs(Link, { href: route("clients.create"), children: [
          /* @__PURE__ */ jsx(Plus, { className: "mr-1 h-4 w-4" }),
          t("clients.actions.create") ?? "Add Client"
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxs("form", { onSubmit: handleSearch, className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              placeholder: t("clients.actions.search") ?? "Search...",
              value: search,
              onChange: (e) => setSearch(e.target.value),
              className: "w-60"
            }
          ),
          /* @__PURE__ */ jsx(Button, { type: "submit", variant: "outline", size: "sm", children: t("clients.actions.search") })
        ] }),
        /* @__PURE__ */ jsxs(Select, { value: filters.group ?? "all", onValueChange: handleGroupChange, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-48", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: t("clients.actions.filter_by_group") ?? "Filter by group" }) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "all", children: t("clients.actions.all_groups") ?? "All groups" }),
            groups.map((g) => /* @__PURE__ */ jsx(SelectItem, { value: g.id, children: g.name }, g.id))
          ] })
        ] })
      ] }),
      clients.data.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "text-muted-foreground flex flex-col items-center gap-2 py-16", children: [
        /* @__PURE__ */ jsx(Building2, { className: "h-10 w-10 opacity-30" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm", children: t("clients.empty") ?? "No clients yet." })
      ] }) : /* @__PURE__ */ jsx("div", { className: "rounded-md border", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-muted/30 border-b text-left", children: [
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: t("clients.fields.name") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: t("clients.contact.title") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: t("clients.fields.phone") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: t("clients.fields.groups") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: t("clients.fields.owner") })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: clients.data.map((client) => {
          var _a2;
          return /* @__PURE__ */ jsxs("tr", { className: "hover:bg-muted/20 border-b last:border-0", children: [
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx(
              Link,
              {
                href: route("clients.show", { client: client.id }),
                className: "font-medium underline-offset-2 hover:underline",
                children: client.name
              }
            ) }),
            /* @__PURE__ */ jsx("td", { className: "text-muted-foreground px-4 py-3", children: client.primary_contact ? `${client.primary_contact.first_name} ${client.primary_contact.last_name ?? ""}`.trim() : "—" }),
            /* @__PURE__ */ jsx("td", { className: "text-muted-foreground px-4 py-3", children: client.phone ?? "—" }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1", children: (client.groups ?? []).map((g) => /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "text-xs", children: g.name }, g.id)) }) }),
            /* @__PURE__ */ jsx("td", { className: "text-muted-foreground px-4 py-3", children: ((_a2 = client.owner) == null ? void 0 : _a2.name) ?? "—" })
          ] }, client.id);
        }) })
      ] }) }),
      clients.last_page > 1 && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2", children: [
        clients.prev_page_url ? /* @__PURE__ */ jsxs(
          Link,
          {
            href: clients.prev_page_url,
            className: "text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline",
            children: [
              "← ",
              t("common.prev") ?? "Previous"
            ]
          }
        ) : /* @__PURE__ */ jsx("span", { className: "text-muted-foreground/40 text-sm", children: "←" }),
        /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground text-sm", children: [
          clients.current_page,
          " / ",
          clients.last_page
        ] }),
        clients.next_page_url ? /* @__PURE__ */ jsxs(
          Link,
          {
            href: clients.next_page_url,
            className: "text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline",
            children: [
              t("common.next") ?? "Next",
              " →"
            ]
          }
        ) : /* @__PURE__ */ jsx("span", { className: "text-muted-foreground/40 text-sm", children: "→" })
      ] })
    ] })
  ] });
}
const __vite_glob_0_23 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ClientsIndex
}, Symbol.toStringTag, { value: "Module" }));
function ContactManager({ clientId, contacts, contactFieldDefs, canEdit }) {
  const t = useTranslator();
  const [open, setOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const { data, setData, post, put, processing, errors, reset } = useForm({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    title: "",
    language: "",
    make_primary: false,
    custom_fields: {}
  });
  function openAdd() {
    reset();
    setEditingContact(null);
    setOpen(true);
  }
  function openEdit(contact) {
    setData({
      first_name: contact.first_name,
      last_name: contact.last_name ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      title: contact.title ?? "",
      language: contact.language ?? "",
      make_primary: contact.is_primary,
      custom_fields: contact.custom_fields ?? {}
    });
    setEditingContact(contact);
    setOpen(true);
  }
  function handleSubmit(e) {
    e.preventDefault();
    if (editingContact) {
      put(route("contacts.update", { contact: editingContact.id }), {
        onSuccess: () => setOpen(false)
      });
    } else {
      post(route("clients.contacts.store", { client: clientId }), {
        onSuccess: () => setOpen(false)
      });
    }
  }
  function handleSetPrimary(contact) {
    router.post(route("contacts.primary", { contact: contact.id }), {}, { preserveScroll: true });
  }
  function handleDelete(contact) {
    if (!confirm(t("clients.contact.delete_confirm") ?? "Delete this contact?")) return;
    router.delete(route("contacts.destroy", { contact: contact.id }), { preserveScroll: true });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold", children: t("clients.contact.title") ?? "Contacts" }),
      canEdit && /* @__PURE__ */ jsxs(Button, { type: "button", variant: "outline", size: "sm", onClick: openAdd, className: "h-7 gap-1 text-xs", children: [
        /* @__PURE__ */ jsx(UserPlus, { className: "h-3 w-3" }),
        t("clients.contact.add") ?? "Add Contact"
      ] })
    ] }),
    contacts.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground py-4 text-center text-sm", children: t("clients.contact.none") ?? "No contacts yet" }) : /* @__PURE__ */ jsx("ul", { className: "divide-border divide-y rounded-md border", children: contacts.map((contact) => /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between px-4 py-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxs("span", { className: "truncate text-sm font-medium", children: [
            contact.first_name,
            " ",
            contact.last_name
          ] }),
          contact.is_primary && /* @__PURE__ */ jsx(Badge, { variant: "default", className: "h-5 text-xs", children: t("clients.contact.is_primary") ?? "Primary" })
        ] }),
        contact.email && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground truncate text-xs", children: contact.email }),
        contact.title && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: contact.title })
      ] }),
      canEdit && /* @__PURE__ */ jsxs("div", { className: "ml-2 flex shrink-0 items-center gap-1", children: [
        !contact.is_primary && /* @__PURE__ */ jsx(
          Button,
          {
            type: "button",
            variant: "ghost",
            size: "icon",
            className: "h-7 w-7",
            title: t("clients.contact.set_primary") ?? "Set Primary",
            onClick: () => handleSetPrimary(contact),
            children: /* @__PURE__ */ jsx(Star, { className: "h-3.5 w-3.5" })
          }
        ),
        /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-7 w-7", onClick: () => openEdit(contact), children: /* @__PURE__ */ jsx(Pencil, { className: "h-3.5 w-3.5" }) }),
        /* @__PURE__ */ jsx(
          Button,
          {
            type: "button",
            variant: "ghost",
            size: "icon",
            className: "text-destructive hover:text-destructive h-7 w-7",
            onClick: () => handleDelete(contact),
            children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" })
          }
        )
      ] })
    ] }, contact.id)) }),
    /* @__PURE__ */ jsx(Dialog, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-lg", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: editingContact ? t("clients.contact.edit") : t("clients.contact.add") }),
        /* @__PURE__ */ jsx(DialogDescription, { children: t("clients.contact.dialog_description") ?? "Fill in the contact details below." })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs(Label, { htmlFor: "contact_first_name", children: [
              t("clients.contact.first_name"),
              " *"
            ] }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "contact_first_name",
                value: data.first_name,
                onChange: (e) => setData("first_name", e.target.value),
                required: true
              }
            ),
            errors.first_name && /* @__PURE__ */ jsx("p", { className: "text-destructive mt-1 text-xs", children: errors.first_name })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "contact_last_name", children: t("clients.contact.last_name") }),
            /* @__PURE__ */ jsx(Input, { id: "contact_last_name", value: data.last_name, onChange: (e) => setData("last_name", e.target.value) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "contact_email", children: t("clients.contact.email") }),
          /* @__PURE__ */ jsx(Input, { id: "contact_email", type: "email", value: data.email, onChange: (e) => setData("email", e.target.value) }),
          errors.email && /* @__PURE__ */ jsx("p", { className: "text-destructive mt-1 text-xs", children: errors.email })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "contact_phone", children: t("clients.contact.phone") }),
            /* @__PURE__ */ jsx(Input, { id: "contact_phone", value: data.phone, onChange: (e) => setData("phone", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "contact_title", children: t("clients.contact.job_title") }),
            /* @__PURE__ */ jsx(Input, { id: "contact_title", value: data.title, onChange: (e) => setData("title", e.target.value) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "contact_language", children: t("clients.contact.language") }),
          /* @__PURE__ */ jsxs(Select, { value: data.language, onValueChange: (v) => setData("language", v), children: [
            /* @__PURE__ */ jsx(SelectTrigger, { id: "contact_language", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "-" }) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "vi", children: "Tiếng Việt" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "en", children: "English" })
            ] })
          ] })
        ] }),
        contactFieldDefs.length > 0 && /* @__PURE__ */ jsx(
          CustomFieldsSection,
          {
            definitions: contactFieldDefs,
            values: data.custom_fields,
            errors,
            onChange: (slug, value) => setData("custom_fields", { ...data.custom_fields, [slug]: value })
          }
        ),
        /* @__PURE__ */ jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", onClick: () => setOpen(false), children: t("clients.actions.cancel") }),
          /* @__PURE__ */ jsx(Button, { type: "submit", disabled: processing, children: t("clients.actions.save") })
        ] })
      ] })
    ] }) })
  ] });
}
function CustomerAdminSelector({ users, selected, onChange }) {
  const t = useTranslator();
  function toggle(id) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }
  function remove(id) {
    onChange(selected.filter((s) => s !== id));
  }
  const selectedUsers = users.filter((u) => selected.includes(u.id));
  return /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1", children: [
      selectedUsers.map((u) => /* @__PURE__ */ jsxs(Badge, { variant: "secondary", className: "gap-1", children: [
        u.name,
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => remove(u.id), className: "hover:text-destructive ml-0.5", children: /* @__PURE__ */ jsx(X, { className: "h-3 w-3" }) })
      ] }, u.id)),
      selectedUsers.length === 0 && /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-sm", children: t("clients.customer_admin.none") ?? "None" })
    ] }),
    /* @__PURE__ */ jsxs(Popover, { children: [
      /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { type: "button", variant: "outline", size: "sm", className: "h-8 gap-1", children: [
        t("clients.customer_admin.add") ?? "Add Admin",
        /* @__PURE__ */ jsx(ChevronDown, { className: "h-3 w-3" })
      ] }) }),
      /* @__PURE__ */ jsx(PopoverContent, { className: "w-60 p-2", align: "start", children: users.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground px-2 py-1 text-sm", children: t("clients.customer_admin.none") }) : users.map((user) => /* @__PURE__ */ jsxs("div", { className: "hover:bg-accent flex items-center gap-2 rounded px-2 py-1", children: [
        /* @__PURE__ */ jsx(
          Checkbox,
          {
            id: `admin-${user.id}`,
            checked: selected.includes(user.id),
            onCheckedChange: () => toggle(user.id)
          }
        ),
        /* @__PURE__ */ jsx(Label, { htmlFor: `admin-${user.id}`, className: "cursor-pointer font-normal", children: user.name })
      ] }, user.id)) })
    ] })
  ] });
}
const defaultFormData = {
  name: "",
  server_address: "",
  port: "",
  username: "",
  password: "",
  description: "",
  share_in_projects: false,
  visibility: "private"
};
function VaultList({ clientId, entries, canEdit }) {
  const t = useTranslator();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { data, setData, post, put, processing, errors, reset } = useForm(defaultFormData);
  function openAdd() {
    reset();
    setEditing(null);
    setOpen(true);
  }
  function openEdit(entry) {
    setData({
      name: entry.name,
      server_address: entry.server_address ?? "",
      port: entry.port ?? "",
      username: entry.username ?? "",
      password: "",
      // never pre-fill password
      description: entry.description ?? "",
      share_in_projects: entry.share_in_projects,
      visibility: entry.visibility
    });
    setEditing(entry);
    setOpen(true);
  }
  function handleSubmit(e) {
    e.preventDefault();
    if (editing) {
      put(route("clients.vault.update", { client: clientId, vaultEntry: editing.id }), {
        onSuccess: () => setOpen(false)
      });
    } else {
      post(route("clients.vault.store", { client: clientId }), {
        onSuccess: () => setOpen(false)
      });
    }
  }
  function handleDelete(entry) {
    if (!confirm(t("clients.vault.delete_confirm") ?? "Delete this vault entry?")) return;
    router.delete(route("clients.vault.destroy", { client: clientId, vaultEntry: entry.id }), { preserveScroll: true });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold", children: t("clients.vault.title") ?? "Vault" }),
      canEdit && /* @__PURE__ */ jsxs(Button, { type: "button", variant: "outline", size: "sm", onClick: openAdd, className: "h-7 gap-1 text-xs", children: [
        /* @__PURE__ */ jsx(Plus, { className: "h-3 w-3" }),
        t("clients.vault.add") ?? "Add Entry"
      ] })
    ] }),
    entries.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground py-4 text-center text-sm", children: t("clients.vault.empty") ?? "No vault entries" }) : /* @__PURE__ */ jsx("ul", { className: "divide-border divide-y rounded-md border", children: entries.map((entry) => /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between px-4 py-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Lock, { className: "text-muted-foreground h-4 w-4 shrink-0" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: entry.name }),
          entry.server_address && /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground text-xs", children: [
            entry.server_address,
            entry.port ? `:${entry.port}` : ""
          ] })
        ] })
      ] }),
      canEdit && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-7 w-7", onClick: () => openEdit(entry), children: /* @__PURE__ */ jsx(Pencil, { className: "h-3.5 w-3.5" }) }),
        /* @__PURE__ */ jsx(
          Button,
          {
            type: "button",
            variant: "ghost",
            size: "icon",
            className: "text-destructive hover:text-destructive h-7 w-7",
            onClick: () => handleDelete(entry),
            children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" })
          }
        )
      ] })
    ] }, entry.id)) }),
    /* @__PURE__ */ jsx(Dialog, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-md", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: editing ? t("clients.vault.edit") ?? "Edit Entry" : t("clients.vault.add") }),
        /* @__PURE__ */ jsx(DialogDescription, { children: t("clients.vault.dialog_description") ?? "Securely store credentials or notes for this client." })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs(Label, { htmlFor: "vault_name", children: [
            t("clients.vault.name"),
            " *"
          ] }),
          /* @__PURE__ */ jsx(Input, { id: "vault_name", value: data.name, onChange: (e) => setData("name", e.target.value), required: true }),
          errors.name && /* @__PURE__ */ jsx("p", { className: "text-destructive mt-1 text-xs", children: errors.name })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "vault_server", children: t("clients.vault.server_address") }),
            /* @__PURE__ */ jsx(Input, { id: "vault_server", value: data.server_address, onChange: (e) => setData("server_address", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "vault_port", children: t("clients.vault.port") }),
            /* @__PURE__ */ jsx(Input, { id: "vault_port", value: data.port, onChange: (e) => setData("port", e.target.value) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "vault_username", children: t("clients.vault.username") }),
          /* @__PURE__ */ jsx(Input, { id: "vault_username", value: data.username, onChange: (e) => setData("username", e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "vault_password", children: t("clients.vault.password") }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "vault_password",
              type: "password",
              autoComplete: "new-password",
              value: data.password,
              onChange: (e) => setData("password", e.target.value),
              placeholder: editing ? "(unchanged)" : ""
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "vault_visibility", children: t("clients.vault.visibility") }),
          /* @__PURE__ */ jsxs(Select, { value: data.visibility, onValueChange: (v) => setData("visibility", v), children: [
            /* @__PURE__ */ jsx(SelectTrigger, { id: "vault_visibility", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "private", children: t("clients.vault.visibility_private") }),
              /* @__PURE__ */ jsx(SelectItem, { value: "shared", children: t("clients.vault.visibility_shared") })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", onClick: () => setOpen(false), children: t("clients.actions.cancel") }),
          /* @__PURE__ */ jsx(Button, { type: "submit", disabled: processing, children: t("clients.actions.save") })
        ] })
      ] })
    ] }) })
  ] });
}
function ActivityItemCard({ activity }) {
  const t = useTranslator();
  const timeAgo = formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true });
  return /* @__PURE__ */ jsxs("div", { className: "flex gap-3 py-3", children: [
    /* @__PURE__ */ jsx("div", { className: "bg-muted mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", children: /* @__PURE__ */ jsx(Activity, { className: "text-muted-foreground h-3.5 w-3.5" }) }),
    /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
      /* @__PURE__ */ jsx("p", { className: "text-foreground text-sm leading-snug", children: activity.message }),
      /* @__PURE__ */ jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs", children: timeAgo }),
        activity.visible_to_customer && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "h-4 gap-1 px-1.5 py-0 text-[10px]", children: [
          /* @__PURE__ */ jsx(Tag, { className: "h-2.5 w-2.5" }),
          t("activity.visible_customer") ?? "Client visible"
        ] })
      ] })
    ] })
  ] });
}
function ActivityTimeline({ activities, visibleToCustomerOnly = false }) {
  const t = useTranslator();
  const items = visibleToCustomerOnly ? activities.filter((a) => a.visible_to_customer) : activities;
  if (items.length === 0) {
    return /* @__PURE__ */ jsx("p", { className: "text-muted-foreground py-6 text-center text-sm", children: t("activity.empty") ?? "No activity yet." });
  }
  return /* @__PURE__ */ jsx("div", { className: "divide-border divide-y", children: items.map((activity) => /* @__PURE__ */ jsx(ActivityItemCard, { activity }, activity.id)) });
}
function AttachmentList({ attachments, canDelete = false }) {
  const t = useTranslator();
  const { delete: destroy, processing } = useForm();
  if (attachments.length === 0) {
    return /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: t("attachments.no_attachments") });
  }
  const formatBytes = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  return /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: attachments.map((attachment) => /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between rounded-md border p-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex min-w-0 items-center gap-3", children: [
      /* @__PURE__ */ jsx(Paperclip, { className: "text-muted-foreground h-4 w-4 shrink-0" }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-medium", children: attachment.original_name }),
        attachment.size && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: formatBytes(attachment.size) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-1", children: [
      /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", asChild: true, children: /* @__PURE__ */ jsxs("a", { href: route("attachments.download", { attachmentKey: attachment.attachment_key }), children: [
        /* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }),
        /* @__PURE__ */ jsx("span", { className: "sr-only", children: t("attachments.download") })
      ] }) }),
      canDelete && /* @__PURE__ */ jsxs(
        Button,
        {
          variant: "ghost",
          size: "sm",
          disabled: processing,
          onClick: () => {
            if (confirm(t("attachments.delete_confirm"))) {
              destroy(route("attachments.destroy", { attachment: attachment.id }));
            }
          },
          children: [
            /* @__PURE__ */ jsx(Trash2, { className: "text-destructive h-4 w-4" }),
            /* @__PURE__ */ jsx("span", { className: "sr-only", children: t("attachments.deleted") })
          ]
        }
      )
    ] })
  ] }, attachment.id)) });
}
function NoteForm({ noteableType, noteableId, initial, onCancel }) {
  const t = useTranslator();
  const isEdit = !!initial;
  const { data, setData, post, put, processing, errors, reset } = useForm({
    noteable_type: noteableType,
    noteable_id: noteableId,
    body: (initial == null ? void 0 : initial.body) ?? "",
    date_contacted: (initial == null ? void 0 : initial.date_contacted) ?? ""
  });
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEdit) {
      put(route("notes.update", { note: initial.id }), {
        preserveScroll: true,
        onSuccess: () => onCancel == null ? void 0 : onCancel()
      });
    } else {
      post(route("notes.store"), {
        preserveScroll: true,
        onSuccess: () => {
          reset("body", "date_contacted");
          onCancel == null ? void 0 : onCancel();
        }
      });
    }
  };
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-2", children: [
    /* @__PURE__ */ jsx(
      "textarea",
      {
        value: data.body,
        onChange: (e) => setData("body", e.target.value),
        placeholder: t("notes.write_note"),
        rows: 3,
        className: "focus:ring-ring w-full resize-none rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
      }
    ),
    /* @__PURE__ */ jsx(InputError, { message: errors.body }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx("label", { className: "text-muted-foreground shrink-0 text-xs", children: t("notes.date_contacted") }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "date",
          value: data.date_contacted ?? "",
          onChange: (e) => setData("date_contacted", e.target.value || ""),
          className: "rounded-md border px-2 py-1 text-sm"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsx(Button, { type: "submit", size: "sm", disabled: !data.body.trim() || processing, children: t("notes.save") }),
      onCancel && /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: onCancel, children: t("notes.cancel") })
    ] })
  ] });
}
function NoteList({ notes, noteableType, noteableId, currentUserId, canManage = false }) {
  const t = useTranslator();
  const [editingId, setEditingId] = useState(null);
  const { delete: destroy, processing } = useForm();
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsx(NoteForm, { noteableType, noteableId }),
    notes.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "text-muted-foreground flex items-center gap-2 text-sm", children: [
      /* @__PURE__ */ jsx(FileText, { className: "h-4 w-4" }),
      t("notes.no_notes")
    ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-3", children: notes.map((note) => {
      var _a, _b;
      return /* @__PURE__ */ jsx("div", { children: editingId === note.id ? /* @__PURE__ */ jsx(
        NoteForm,
        {
          noteableType,
          noteableId,
          initial: { id: note.id, body: note.body, date_contacted: note.date_contacted },
          onCancel: () => setEditingId(null)
        }
      ) : /* @__PURE__ */ jsxs("div", { className: "rounded-md border p-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-1 flex items-center justify-between", children: [
          /* @__PURE__ */ jsx("span", { className: "text-xs font-medium", children: ((_a = note.author) == null ? void 0 : _a.name) ?? "—" }),
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs", children: note.created_at })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-sm whitespace-pre-wrap", children: note.body }),
        note.date_contacted && /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground mt-1 text-xs", children: [
          t("notes.date_contacted"),
          ": ",
          note.date_contacted
        ] }),
        (canManage || ((_b = note.author) == null ? void 0 : _b.id) === currentUserId) && /* @__PURE__ */ jsxs("div", { className: "mt-2 flex gap-1", children: [
          /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "sm", className: "h-6", onClick: () => setEditingId(note.id), children: /* @__PURE__ */ jsx(Pencil, { className: "h-3 w-3" }) }),
          /* @__PURE__ */ jsx(
            Button,
            {
              type: "button",
              variant: "ghost",
              size: "sm",
              className: "text-destructive h-6",
              disabled: processing,
              onClick: () => {
                if (confirm(t("notes.delete_confirm"))) {
                  destroy(route("notes.destroy", { note: note.id }), {
                    preserveScroll: true
                  });
                }
              },
              children: /* @__PURE__ */ jsx(Trash2, { className: "h-3 w-3" })
            }
          )
        ] })
      ] }) }, note.id);
    }) })
  ] });
}
const EMPTY_TAGS = [];
function TagInput({ tags: initialTags, attachableType, attachableId, availableTags = EMPTY_TAGS }) {
  const t = useTranslator();
  const [selected, setSelected] = useState(initialTags.map((t2) => t2.name));
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);
  const suggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (query.length === 0) return EMPTY_TAGS;
    return availableTags.filter((tag) => tag.name.toLowerCase().includes(query) && !selected.includes(tag.name));
  }, [inputValue, availableTags, selected]);
  const addTag = (name) => {
    const trimmed = name.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    const updated = [...selected, trimmed];
    setSelected(updated);
    setInputValue("");
    syncTags(updated);
  };
  const removeTag = (name) => {
    const updated = selected.filter((s) => s !== name);
    setSelected(updated);
    syncTags(updated);
  };
  const syncTags = (tagNames) => {
    router.post(route("tags.sync"), { attachable_type: attachableType, attachable_id: attachableId, tags: tagNames }, { preserveScroll: true });
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === "Backspace" && inputValue === "" && selected.length > 0) {
      removeTag(selected[selected.length - 1]);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "focus-within:ring-ring flex flex-wrap gap-1 rounded-md border p-2 focus-within:ring-1", children: [
    selected.map((name) => {
      const tag = availableTags.find((t2) => t2.name === name);
      return /* @__PURE__ */ jsxs(
        "span",
        {
          className: "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
          style: (tag == null ? void 0 : tag.color) ? { backgroundColor: tag.color + "20", color: tag.color } : void 0,
          children: [
            name,
            /* @__PURE__ */ jsx("button", { type: "button", onClick: () => removeTag(name), className: "hover:opacity-75", children: /* @__PURE__ */ jsx(X, { className: "h-3 w-3" }) })
          ]
        },
        name
      );
    }),
    /* @__PURE__ */ jsxs("div", { className: "relative flex-1", children: [
      /* @__PURE__ */ jsx(
        Input,
        {
          ref: inputRef,
          value: inputValue,
          onChange: (e) => setInputValue(e.target.value),
          onKeyDown: handleKeyDown,
          onBlur: () => inputValue.trim() && addTag(inputValue),
          placeholder: selected.length === 0 ? t("tags.search_tags") : "",
          className: "h-6 border-none p-0 text-sm shadow-none focus-visible:ring-0"
        }
      ),
      suggestions.length > 0 && /* @__PURE__ */ jsxs("ul", { className: "bg-background absolute top-full left-0 z-10 mt-1 w-48 rounded-md border shadow-md", children: [
        suggestions.map((tag) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
          Button,
          {
            variant: "ghost",
            size: "sm",
            className: "w-full justify-start text-sm",
            onMouseDown: (e) => {
              e.preventDefault();
              addTag(tag.name);
            },
            children: tag.name
          }
        ) }, tag.id)),
        inputValue.trim() && !availableTags.some((t2) => t2.name.toLowerCase() === inputValue.toLowerCase()) && /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
          Button,
          {
            variant: "ghost",
            size: "sm",
            className: "text-muted-foreground w-full justify-start text-sm",
            onMouseDown: (e) => {
              e.preventDefault();
              addTag(inputValue);
            },
            children: t("tags.create_tag", { name: inputValue })
          }
        ) })
      ] })
    ] })
  ] });
}
const Tabs = TabsPrimitive.Root;
const TabsList = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  TabsPrimitive.List,
  {
    ref,
    className: cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    ),
    ...props
  }
));
TabsList.displayName = TabsPrimitive.List.displayName;
const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  TabsPrimitive.Trigger,
  {
    ref,
    className: cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    ),
    ...props
  }
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
const TabsContent = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  TabsPrimitive.Content,
  {
    ref,
    className: cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    ),
    ...props
  }
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
function ClientShow({
  client,
  clientFieldDefs,
  contactFieldDefs,
  availableGroups,
  availableAdmins,
  vaultEntries = [],
  attachments = [],
  notes = [],
  canEdit = false,
  canDelete = false
}) {
  const t = useTranslator();
  const breadcrumbs2 = [
    { title: t("clients.title.index") ?? "Clients", href: route("clients.index") },
    { title: client.name, href: route("clients.show", { client: client.id }) }
  ];
  function handleDelete() {
    if (!confirm(t("clients.actions.delete_confirm") ?? "Delete this client?")) return;
    router.delete(route("clients.destroy", { client: client.id }));
  }
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: client.name }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-4 md:p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(PageHeader, { title: client.name }),
          /* @__PURE__ */ jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-2", children: [
            client.phone && /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground flex items-center gap-1 text-sm", children: [
              /* @__PURE__ */ jsx(Phone, { className: "h-3.5 w-3.5" }),
              client.phone
            ] }),
            client.website && /* @__PURE__ */ jsxs(
              "a",
              {
                href: client.website,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "text-muted-foreground flex items-center gap-1 text-sm hover:underline",
                children: [
                  /* @__PURE__ */ jsx(Globe, { className: "h-3.5 w-3.5" }),
                  client.website
                ]
              }
            ),
            (client.groups ?? []).map((g) => /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "text-xs", children: g.name }, g.id))
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          canEdit && /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", asChild: true, children: /* @__PURE__ */ jsxs(Link, { href: route("clients.edit", { client: client.id }), children: [
            /* @__PURE__ */ jsx(Pencil, { className: "mr-1 h-3.5 w-3.5" }),
            t("clients.actions.edit")
          ] }) }),
          canDelete && /* @__PURE__ */ jsxs(Button, { variant: "destructive", size: "sm", onClick: handleDelete, children: [
            /* @__PURE__ */ jsx(Trash2, { className: "mr-1 h-3.5 w-3.5" }),
            t("clients.actions.delete")
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(TagInput, { tags: client.tags ?? [], attachableType: "client", attachableId: client.id }),
      /* @__PURE__ */ jsxs(Tabs, { defaultValue: "profile", children: [
        /* @__PURE__ */ jsxs(TabsList, { children: [
          /* @__PURE__ */ jsx(TabsTrigger, { value: "profile", children: t("clients.tabs.profile") }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "contacts", children: t("clients.tabs.contacts") }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "files", children: t("clients.tabs.files") }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "notes", children: t("clients.tabs.notes") }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "activity", children: t("clients.tabs.activity") }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "vault", children: t("clients.tabs.vault") })
        ] }),
        /* @__PURE__ */ jsxs(TabsContent, { value: "profile", className: "mt-4 space-y-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [
            client.vat && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: t("clients.fields.vat") }),
              /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: client.vat })
            ] }),
            client.currency && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: t("clients.fields.currency") }),
              /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: client.currency })
            ] }),
            client.default_language && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: t("clients.fields.default_language") }),
              /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: client.default_language === "vi" ? "Tiếng Việt" : "English" })
            ] }),
            client.owner && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: t("clients.fields.owner") }),
              /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: client.owner.name })
            ] })
          ] }),
          clientFieldDefs.length > 0 && client.custom_fields && /* @__PURE__ */ jsx("div", { className: "grid gap-3 sm:grid-cols-2", children: clientFieldDefs.map((def) => {
            const value = client.custom_fields[def.slug];
            if (value === void 0 || value === null || value === "") return null;
            return /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: def.name }),
              /* @__PURE__ */ jsx("p", { className: "text-sm", children: String(value) })
            ] }, def.id);
          }) }),
          canEdit && /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "mb-2 text-sm font-medium", children: t("clients.customer_admin.title") }),
            /* @__PURE__ */ jsx(
              CustomerAdminSelector,
              {
                users: availableAdmins,
                selected: (client.customer_admins ?? []).map((u) => u.id),
                onChange: (ids) => {
                  router.post(
                    route("clients.customer-admins.sync", { client: client.id }),
                    { user_ids: ids },
                    { preserveScroll: true }
                  );
                }
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsx(TabsContent, { value: "contacts", className: "mt-4", children: /* @__PURE__ */ jsx(ContactManager, { clientId: client.id, contacts: client.contacts ?? [], contactFieldDefs, canEdit }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "files", className: "mt-4", children: /* @__PURE__ */ jsx(AttachmentList, { attachments, canDelete: canEdit }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "notes", className: "mt-4", children: /* @__PURE__ */ jsx(NoteList, { noteableType: "client", noteableId: client.id, notes, canManage: canEdit }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "activity", className: "mt-4", children: /* @__PURE__ */ jsx(ActivityTimeline, { activities: client.activities ?? [] }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "vault", className: "mt-4", children: /* @__PURE__ */ jsx(VaultList, { clientId: client.id, entries: vaultEntries, canEdit }) })
      ] })
    ] })
  ] });
}
const __vite_glob_0_24 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ClientShow
}, Symbol.toStringTag, { value: "Module" }));
function LeadAssignPopover({ lead, members }) {
  const t = useTranslator();
  const [open, setOpen] = useState(false);
  const { data, setData, post, processing } = useForm({
    assigned_to: lead.assigned_to ? String(lead.assigned_to) : ""
  });
  function handleAssign(userId) {
    setData("assigned_to", userId);
    post(route("leads.assign", lead.id), {
      onSuccess: () => setOpen(false)
    });
  }
  return /* @__PURE__ */ jsxs(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", children: [
      /* @__PURE__ */ jsx(UserCheck, { className: "mr-2 h-4 w-4" }),
      t("leads.actions.assign")
    ] }) }),
    /* @__PURE__ */ jsx(PopoverContent, { className: "w-56 p-2", children: /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          className: "hover:bg-accent w-full rounded px-2 py-1.5 text-left text-sm",
          onClick: () => handleAssign(""),
          disabled: processing,
          children: [
            "— ",
            t("leads.fields.assigned_to")
          ]
        }
      ),
      members.map((m) => /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          className: "hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm",
          onClick: () => handleAssign(String(m.id)),
          disabled: processing,
          children: [
            processing && data.assigned_to === String(m.id) && /* @__PURE__ */ jsx(Loader2, { className: "h-3 w-3 animate-spin" }),
            m.name,
            lead.assigned_to === m.id && /* @__PURE__ */ jsx("span", { className: "text-primary ml-auto text-xs", children: "✓" })
          ]
        },
        m.id
      ))
    ] }) })
  ] });
}
const __vite_glob_0_25 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: LeadAssignPopover
}, Symbol.toStringTag, { value: "Module" }));
function LeadCard({ lead, draggable, onDragStart }) {
  const t = useTranslator();
  const statusBadge = lead.is_lost ? /* @__PURE__ */ jsx(Badge, { variant: "destructive", className: "text-xs", children: t("leads.status.lost") }) : lead.is_junk ? /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "text-xs", children: t("leads.status.junk") }) : lead.date_converted ? /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-xs", children: t("leads.status.converted") }) : null;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      draggable,
      onDragStart: onDragStart ? (e) => onDragStart(e, lead) : void 0,
      className: "bg-card hover:bg-accent/50 cursor-grab rounded-lg border p-3 shadow-sm transition-colors active:cursor-grabbing",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-2 flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsx(Link, { href: route("leads.show", lead.id), className: "text-sm font-medium hover:underline", children: lead.name }),
          statusBadge
        ] }),
        lead.company && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mb-1 truncate text-xs", children: lead.company }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          lead.email && /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground flex items-center gap-1 text-xs", children: [
            /* @__PURE__ */ jsx(Mail, { className: "h-3 w-3 shrink-0" }),
            /* @__PURE__ */ jsx("span", { className: "truncate", children: lead.email })
          ] }),
          lead.phone && /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground flex items-center gap-1 text-xs", children: [
            /* @__PURE__ */ jsx(Phone, { className: "h-3 w-3 shrink-0" }),
            lead.phone
          ] }),
          lead.assignee && /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground flex items-center gap-1 text-xs", children: [
            /* @__PURE__ */ jsx(User, { className: "h-3 w-3 shrink-0" }),
            lead.assignee.name
          ] }),
          lead.lead_value && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 text-xs font-medium text-emerald-600", children: [
            /* @__PURE__ */ jsx(DollarSign, { className: "h-3 w-3 shrink-0" }),
            Number(lead.lead_value).toLocaleString()
          ] })
        ] }),
        (lead.tags ?? []).length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-2 flex flex-wrap gap-1", children: (lead.tags ?? []).slice(0, 3).map((tag) => /* @__PURE__ */ jsx(
          Badge,
          {
            variant: "outline",
            className: "px-1.5 py-0 text-[10px]",
            style: tag.color ? { borderColor: tag.color, color: tag.color } : void 0,
            children: tag.name
          },
          tag.id
        )) })
      ]
    }
  );
}
const __vite_glob_0_26 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: LeadCard
}, Symbol.toStringTag, { value: "Module" }));
const CREATE_NEW = "__create_new__";
function LeadConvertDialog({ lead, clients }) {
  const t = useTranslator();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("new");
  const { data, setData, post, processing, errors, reset } = useForm({
    client_id: null,
    client_name: lead.company ?? lead.name,
    contact_name: lead.name
  });
  function handleModeChange(value) {
    if (value === CREATE_NEW) {
      setMode("new");
      setData((prev) => ({ ...prev, client_id: null }));
    } else {
      setMode("existing");
      setData((prev) => ({ ...prev, client_id: value }));
    }
  }
  function handleSubmit(e) {
    e.preventDefault();
    post(route("leads.convert", lead.id), {
      onSuccess: () => {
        setOpen(false);
        reset();
      }
    });
  }
  if (lead.date_converted) {
    return null;
  }
  return /* @__PURE__ */ jsxs(Dialog, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "default", size: "sm", children: [
      /* @__PURE__ */ jsx(RefreshCw, { className: "mr-2 h-4 w-4" }),
      t("leads.actions.convert")
    ] }) }),
    /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-md", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: t("leads.convert.title") }),
        /* @__PURE__ */ jsx(DialogDescription, { children: t("leads.convert.description") ?? "Convert this lead into a client record." })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 py-2", children: [
        clients.length > 0 && /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { children: t("leads.convert.attach_to") ?? "Attach to" }),
          /* @__PURE__ */ jsxs(Select, { value: mode === "existing" ? data.client_id ?? "" : CREATE_NEW, onValueChange: handleModeChange, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: CREATE_NEW, children: t("leads.convert.create_new_client") ?? "Create new client" }),
              clients.map((c) => /* @__PURE__ */ jsx(SelectItem, { value: c.id, children: c.name }, c.id))
            ] })
          ] })
        ] }),
        mode === "new" && /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "client_name", children: t("leads.convert.client_name") }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "client_name",
              value: data.client_name,
              onChange: (e) => setData("client_name", e.target.value),
              placeholder: t("leads.convert.client_name")
            }
          ),
          errors.client_name && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.client_name })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "contact_name", children: t("leads.convert.contact_name") }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "contact_name",
              value: data.contact_name,
              onChange: (e) => setData("contact_name", e.target.value),
              placeholder: t("leads.convert.contact_name")
            }
          ),
          errors.contact_name && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.contact_name })
        ] }),
        /* @__PURE__ */ jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", onClick: () => setOpen(false), children: t("platform.actions.cancel") ?? "Cancel" }),
          /* @__PURE__ */ jsxs(Button, { type: "submit", disabled: processing, children: [
            processing && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
            t("leads.convert.submit")
          ] })
        ] })
      ] })
    ] })
  ] });
}
const __vite_glob_0_27 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: LeadConvertDialog
}, Symbol.toStringTag, { value: "Module" }));
function LeadForm({ lead, pipelines, sources, members, fieldDefs, submitRoute, method }) {
  var _a;
  const t = useTranslator();
  const defaultPipeline = pipelines.find((p) => p.is_default) ?? pipelines[0];
  const initialPipeline = lead ? pipelines.find((p) => p.id === lead.pipeline_id) ?? defaultPipeline : defaultPipeline;
  const [availableStages, setAvailableStages] = useState((initialPipeline == null ? void 0 : initialPipeline.stages) ?? []);
  const { data, setData, post, patch, processing, errors } = useForm({
    name: (lead == null ? void 0 : lead.name) ?? "",
    title: (lead == null ? void 0 : lead.title) ?? "",
    email: (lead == null ? void 0 : lead.email) ?? "",
    phone: (lead == null ? void 0 : lead.phone) ?? "",
    company: (lead == null ? void 0 : lead.company) ?? "",
    lead_value: (lead == null ? void 0 : lead.lead_value) ?? "",
    website: (lead == null ? void 0 : lead.website) ?? "",
    description: (lead == null ? void 0 : lead.description) ?? "",
    address: (lead == null ? void 0 : lead.address) ?? "",
    city: (lead == null ? void 0 : lead.city) ?? "",
    state: (lead == null ? void 0 : lead.state) ?? "",
    zip: (lead == null ? void 0 : lead.zip) ?? "",
    country: (lead == null ? void 0 : lead.country) ?? "",
    pipeline_id: (lead == null ? void 0 : lead.pipeline_id) ?? (initialPipeline == null ? void 0 : initialPipeline.id) ?? "",
    stage_id: (lead == null ? void 0 : lead.stage_id) ?? ((_a = initialPipeline == null ? void 0 : initialPipeline.stages[0]) == null ? void 0 : _a.id) ?? "",
    source_id: (lead == null ? void 0 : lead.source_id) ?? "",
    assigned_to: (lead == null ? void 0 : lead.assigned_to) ? String(lead.assigned_to) : "",
    is_public: (lead == null ? void 0 : lead.is_public) ?? false,
    custom_fields: (lead == null ? void 0 : lead.custom_fields) ?? {}
  });
  useEffect(() => {
    const pipeline = pipelines.find((p) => p.id === data.pipeline_id);
    const stages = (pipeline == null ? void 0 : pipeline.stages) ?? [];
    setAvailableStages(stages);
    if (stages.length > 0 && !stages.find((s) => s.id === data.stage_id)) {
      setData("stage_id", stages[0].id);
    }
  }, [data.pipeline_id]);
  const [pendingSourceName, setPendingSourceName] = useState(null);
  useEffect(() => {
    if (!pendingSourceName) return;
    const created = sources.find((s) => s.name === pendingSourceName);
    if (!created) return;
    setData("source_id", created.id);
    setPendingSourceName(null);
  }, [sources, pendingSourceName, setData]);
  function handleSubmit(e) {
    e.preventDefault();
    if (method === "post") {
      post(submitRoute);
    } else {
      patch(submitRoute);
    }
  }
  function handleCustomFieldChange(slug, value) {
    setData("custom_fields", { ...data.custom_fields, [slug]: value });
  }
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxs(Label, { htmlFor: "name", children: [
          t("leads.fields.name"),
          " *"
        ] }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "name",
            value: data.name,
            onChange: (e) => setData("name", e.target.value),
            placeholder: t("leads.fields.name"),
            required: true
          }
        ),
        errors.name && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.name })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "title", children: t("leads.fields.title") }),
        /* @__PURE__ */ jsx(Input, { id: "title", value: data.title, onChange: (e) => setData("title", e.target.value), placeholder: t("leads.fields.title") })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: t("leads.fields.email") }),
        /* @__PURE__ */ jsx(Input, { id: "email", type: "email", value: data.email, onChange: (e) => setData("email", e.target.value) }),
        errors.email && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.email })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "phone", children: t("leads.fields.phone") }),
        /* @__PURE__ */ jsx(Input, { id: "phone", value: data.phone, onChange: (e) => setData("phone", e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "company", children: t("leads.fields.company") }),
        /* @__PURE__ */ jsx(Input, { id: "company", value: data.company, onChange: (e) => setData("company", e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "lead_value", children: t("leads.fields.lead_value") }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "lead_value",
            type: "number",
            min: "0",
            step: "0.01",
            value: data.lead_value,
            onChange: (e) => setData("lead_value", e.target.value)
          }
        ),
        errors.lead_value && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.lead_value })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "website", children: t("leads.fields.website") }),
        /* @__PURE__ */ jsx(Input, { id: "website", value: data.website, onChange: (e) => setData("website", e.target.value) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxs(Label, { children: [
          t("leads.fields.pipeline"),
          " *"
        ] }),
        /* @__PURE__ */ jsxs(Select, { value: data.pipeline_id, onValueChange: (v) => setData("pipeline_id", v), children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: t("leads.fields.pipeline") }) }),
          /* @__PURE__ */ jsx(SelectContent, { children: pipelines.map((p) => /* @__PURE__ */ jsx(SelectItem, { value: p.id, children: p.name }, p.id)) })
        ] }),
        errors.pipeline_id && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.pipeline_id })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxs(Label, { children: [
          t("leads.fields.stage"),
          " *"
        ] }),
        /* @__PURE__ */ jsxs(Select, { value: data.stage_id, onValueChange: (v) => setData("stage_id", v), children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: t("leads.fields.stage") }) }),
          /* @__PURE__ */ jsx(SelectContent, { children: availableStages.map((s) => /* @__PURE__ */ jsx(SelectItem, { value: s.id, children: s.name }, s.id)) })
        ] }),
        errors.stage_id && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: errors.stage_id })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { children: t("leads.fields.source") }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxs(Select, { value: data.source_id, onValueChange: (v) => setData("source_id", v === "none" ? "" : v), children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: "flex-1", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: t("leads.fields.source") }) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "none", children: "—" }),
              sources.map((s) => /* @__PURE__ */ jsx(SelectItem, { value: s.id, children: s.name }, s.id))
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            QuickCreateLookup,
            {
              storeRoute: route("lookups.lead-sources.store"),
              triggerLabel: t("platform.quick_create.new_source") ?? "New source",
              dialogTitle: t("platform.quick_create.new_source") ?? "New source",
              placeholder: t("leads.fields.source") ?? "Source",
              onCreated: (nm) => setPendingSourceName(nm)
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { children: t("leads.fields.assigned_to") }),
        /* @__PURE__ */ jsxs(Select, { value: data.assigned_to, onValueChange: (v) => setData("assigned_to", v === "none" ? "" : v), children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: t("leads.fields.assigned_to") }) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "none", children: "—" }),
            members.map((m) => /* @__PURE__ */ jsx(SelectItem, { value: String(m.id), children: m.name }, m.id))
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsx(Label, { htmlFor: "description", children: t("leads.fields.description") }),
      /* @__PURE__ */ jsx(Textarea, { id: "description", value: data.description, onChange: (e) => setData("description", e.target.value), rows: 4 })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 sm:col-span-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "address", children: t("leads.address.street") }),
        /* @__PURE__ */ jsx(Input, { id: "address", value: data.address, onChange: (e) => setData("address", e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "city", children: t("leads.address.city") }),
        /* @__PURE__ */ jsx(Input, { id: "city", value: data.city, onChange: (e) => setData("city", e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "country", children: t("leads.address.country") }),
        /* @__PURE__ */ jsx(Input, { id: "country", value: data.country, onChange: (e) => setData("country", e.target.value) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "is_public",
          type: "checkbox",
          checked: data.is_public,
          onChange: (e) => setData("is_public", e.target.checked),
          className: "h-4 w-4 rounded border-gray-300"
        }
      ),
      /* @__PURE__ */ jsx(Label, { htmlFor: "is_public", className: "cursor-pointer", children: t("leads.fields.is_public") })
    ] }),
    fieldDefs.length > 0 && /* @__PURE__ */ jsx(CustomFieldsSection, { definitions: fieldDefs, values: data.custom_fields, errors, onChange: handleCustomFieldChange }),
    /* @__PURE__ */ jsx("div", { className: "flex justify-end gap-3", children: /* @__PURE__ */ jsxs(Button, { type: "submit", disabled: processing, children: [
      processing && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
      method === "post" ? t("leads.actions.create") : t("leads.actions.edit")
    ] }) })
  ] });
}
const __vite_glob_0_28 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: LeadForm
}, Symbol.toStringTag, { value: "Module" }));
function LeadCreate({ pipelines, sources, members, fieldDefs }) {
  const t = useTranslator();
  const breadcrumbs2 = [
    { title: t("leads.title.index") ?? "Leads", href: route("leads.index") },
    { title: t("leads.title.create") ?? "Add Lead", href: route("leads.create") }
  ];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("leads.title.create") ?? "Add Lead" }),
    /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl p-4 md:p-6", children: [
      /* @__PURE__ */ jsx(PageHeader, { title: t("leads.title.create") ?? "Add Lead", className: "mb-6" }),
      /* @__PURE__ */ jsx(
        LeadForm,
        {
          pipelines,
          sources,
          members,
          fieldDefs,
          submitRoute: route("leads.store"),
          method: "post"
        }
      )
    ] })
  ] });
}
const __vite_glob_0_29 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: LeadCreate
}, Symbol.toStringTag, { value: "Module" }));
function LeadEdit({ lead, pipelines, sources, members, fieldDefs }) {
  const t = useTranslator();
  const breadcrumbs2 = [
    { title: t("leads.title.index") ?? "Leads", href: route("leads.index") },
    { title: lead.name, href: route("leads.show", lead.id) },
    { title: t("leads.title.edit") ?? "Edit", href: route("leads.edit", lead.id) }
  ];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("leads.title.edit") ?? "Edit Lead" }),
    /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl p-4 md:p-6", children: [
      /* @__PURE__ */ jsx(PageHeader, { title: t("leads.title.edit") ?? "Edit Lead", className: "mb-6" }),
      /* @__PURE__ */ jsx(
        LeadForm,
        {
          lead,
          pipelines,
          sources,
          members,
          fieldDefs,
          submitRoute: route("leads.update", lead.id),
          method: "patch"
        }
      )
    ] })
  ] });
}
const __vite_glob_0_30 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: LeadEdit
}, Symbol.toStringTag, { value: "Module" }));
function LeadsIndex({ leads, pipelines, filters }) {
  const t = useTranslator();
  const [search, setSearch] = useState(filters.search ?? "");
  const breadcrumbs2 = [{ title: t("leads.title.index") ?? "Leads", href: route("leads.index") }];
  const applyFilter = useCallback(
    (params) => {
      router.get(route("leads.index"), { ...filters, ...params }, { preserveState: true, replace: true });
    },
    [filters]
  );
  function handleSearch(e) {
    e.preventDefault();
    applyFilter({ search });
  }
  function handlePipelineChange(value) {
    applyFilter({ pipeline: value === "all" ? "" : value, stage: "" });
  }
  function statusBadge(lead) {
    if (lead.is_lost) return /* @__PURE__ */ jsx(Badge, { variant: "destructive", children: t("leads.status.lost") });
    if (lead.is_junk) return /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: t("leads.status.junk") });
    if (lead.date_converted) return /* @__PURE__ */ jsx(Badge, { variant: "outline", children: t("leads.status.converted") });
    return /* @__PURE__ */ jsx(Badge, { variant: "default", children: t("leads.status.active") });
  }
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("leads.title.index") ?? "Leads" }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-4 md:p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
        /* @__PURE__ */ jsx(
          PageHeader,
          {
            title: t("leads.title.index") ?? "Leads",
            description: `${leads.total} ${(t("leads.title.index") ?? "leads").toLowerCase()}`
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", asChild: true, children: /* @__PURE__ */ jsxs(Link, { href: route("leads.kanban"), children: [
            /* @__PURE__ */ jsx(Kanban, { className: "mr-2 h-4 w-4" }),
            t("leads.actions.view_kanban")
          ] }) }),
          /* @__PURE__ */ jsx(Button, { size: "sm", asChild: true, children: /* @__PURE__ */ jsxs(Link, { href: route("leads.create"), children: [
            /* @__PURE__ */ jsx(Plus, { className: "mr-2 h-4 w-4" }),
            t("leads.actions.create")
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
        /* @__PURE__ */ jsxs("form", { onSubmit: handleSearch, className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              placeholder: t("platform.actions.search") ?? "Search...",
              value: search,
              onChange: (e) => setSearch(e.target.value),
              className: "w-64"
            }
          ),
          /* @__PURE__ */ jsx(Button, { type: "submit", variant: "secondary", size: "sm", children: t("platform.actions.search") ?? "Search" })
        ] }),
        /* @__PURE__ */ jsxs(Select, { value: filters.pipeline ?? "all", onValueChange: handlePipelineChange, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-44", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: t("leads.fields.pipeline") }) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxs(SelectItem, { value: "all", children: [
              "— ",
              t("leads.fields.pipeline")
            ] }),
            pipelines.map((p) => /* @__PURE__ */ jsx(SelectItem, { value: p.id, children: p.name }, p.id))
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "overflow-x-auto rounded-lg border", children: /* @__PURE__ */ jsxs("table", { className: "min-w-full text-sm", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-muted/50 text-muted-foreground border-b text-left text-xs font-medium tracking-wide uppercase", children: [
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3", children: "#" }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3", children: t("leads.fields.name") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3", children: t("leads.fields.company") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3", children: t("leads.fields.email") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3", children: t("leads.fields.stage") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3", children: t("leads.fields.assigned_to") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3", children: t("leads.fields.lead_value") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3", children: "Status" })
        ] }) }),
        /* @__PURE__ */ jsxs("tbody", { className: "divide-y", children: [
          leads.data.map((lead) => {
            var _a;
            return /* @__PURE__ */ jsxs("tr", { className: "hover:bg-muted/30 transition-colors", children: [
              /* @__PURE__ */ jsxs("td", { className: "text-muted-foreground px-4 py-3 text-xs", children: [
                "#",
                lead.lead_number
              ] }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx(Link, { href: route("leads.show", lead.id), className: "font-medium hover:underline", children: lead.name }) }),
              /* @__PURE__ */ jsx("td", { className: "text-muted-foreground px-4 py-3", children: lead.company ?? "—" }),
              /* @__PURE__ */ jsx("td", { className: "text-muted-foreground px-4 py-3", children: lead.email ?? "—" }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: lead.stage ? /* @__PURE__ */ jsxs(
                "span",
                {
                  className: "inline-flex items-center gap-1 text-xs",
                  style: lead.stage.color ? { color: lead.stage.color } : void 0,
                  children: [
                    /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: "h-2 w-2 rounded-full",
                        style: lead.stage.color ? { background: lead.stage.color } : void 0
                      }
                    ),
                    lead.stage.name
                  ]
                }
              ) : "—" }),
              /* @__PURE__ */ jsx("td", { className: "text-muted-foreground px-4 py-3", children: ((_a = lead.assignee) == null ? void 0 : _a.name) ?? "—" }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-right font-medium", children: lead.lead_value ? Number(lead.lead_value).toLocaleString() : "—" }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: statusBadge(lead) })
            ] }, lead.id);
          }),
          leads.data.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 8, className: "text-muted-foreground px-4 py-8 text-center text-sm", children: t("leads.kanban.empty_stage") }) })
        ] })
      ] }) }),
      leads.last_page > 1 && /* @__PURE__ */ jsxs("div", { className: "flex justify-center gap-2", children: [
        leads.prev_page_url && /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", onClick: () => router.get(leads.prev_page_url), children: "←" }),
        /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground flex items-center text-sm", children: [
          leads.current_page,
          " / ",
          leads.last_page
        ] }),
        leads.next_page_url && /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", onClick: () => router.get(leads.next_page_url), children: "→" })
      ] })
    ] })
  ] });
}
const __vite_glob_0_31 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: LeadsIndex
}, Symbol.toStringTag, { value: "Module" }));
function LeadsKanban({ board, activePipeline, pipelines }) {
  const t = useTranslator();
  const [dragLead, setDragLead] = useState(null);
  const breadcrumbs2 = [
    { title: t("leads.title.index") ?? "Leads", href: route("leads.index") },
    { title: t("leads.title.kanban") ?? "Kanban", href: route("leads.kanban") }
  ];
  function handlePipelineChange(pipelineId) {
    router.get(route("leads.kanban", { pipeline: pipelineId }));
  }
  function handleDragStart(e, lead) {
    setDragLead(lead);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDrop(e, stageId, targetOrder) {
    e.preventDefault();
    if (!dragLead) return;
    if (dragLead.stage_id === stageId && dragLead.lead_order === targetOrder) {
      setDragLead(null);
      return;
    }
    router.patch(
      route("leads.stage", dragLead.id),
      { stage_id: stageId, order: targetOrder },
      {
        preserveScroll: true,
        onFinish: () => setDragLead(null)
      }
    );
  }
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("leads.title.kanban") ?? "Kanban" }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col p-4 md:p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-center justify-between", children: [
        /* @__PURE__ */ jsx(PageHeader, { title: t("leads.title.kanban") ?? "Kanban Board" }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxs(Select, { value: (activePipeline == null ? void 0 : activePipeline.id) ?? "", onValueChange: handlePipelineChange, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: "w-44", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: t("leads.fields.pipeline") }) }),
            /* @__PURE__ */ jsx(SelectContent, { children: pipelines.map((p) => /* @__PURE__ */ jsx(SelectItem, { value: p.id, children: p.name }, p.id)) })
          ] }),
          /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", asChild: true, children: /* @__PURE__ */ jsxs(Link, { href: route("leads.index"), children: [
            /* @__PURE__ */ jsx(List, { className: "mr-2 h-4 w-4" }),
            t("leads.actions.view_list")
          ] }) }),
          /* @__PURE__ */ jsx(Button, { size: "sm", asChild: true, children: /* @__PURE__ */ jsxs(Link, { href: route("leads.create"), children: [
            /* @__PURE__ */ jsx(Plus, { className: "mr-2 h-4 w-4" }),
            t("leads.actions.create")
          ] }) })
        ] })
      ] }),
      !activePipeline ? /* @__PURE__ */ jsx("div", { className: "text-muted-foreground flex flex-1 items-center justify-center text-sm", children: t("leads.kanban.no_pipeline") }) : /* @__PURE__ */ jsx("div", { className: "flex gap-4 overflow-x-auto pb-4", children: board.map((column) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: "flex w-72 shrink-0 flex-col rounded-lg border bg-gray-50",
          onDragOver: handleDragOver,
          onDrop: (e) => handleDrop(e, column.stage.id, column.leads.data.length),
          children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b px-3 py-2", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: "h-2.5 w-2.5 rounded-full",
                    style: column.stage.color ? { background: column.stage.color } : void 0
                  }
                ),
                /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold", children: column.stage.name }),
                /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground text-xs", children: [
                  "(",
                  column.leads.total,
                  ")"
                ] })
              ] }),
              Number(column.total_value) > 0 && /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-emerald-600", children: Number(column.total_value).toLocaleString() })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-2 overflow-y-auto p-2", children: [
              column.leads.data.map((lead, idx) => /* @__PURE__ */ jsx(
                "div",
                {
                  onDragOver: handleDragOver,
                  onDrop: (e) => {
                    e.stopPropagation();
                    handleDrop(e, column.stage.id, idx);
                  },
                  children: /* @__PURE__ */ jsx(LeadCard, { lead, draggable: true, onDragStart: handleDragStart })
                },
                lead.id
              )),
              column.leads.data.length === 0 && /* @__PURE__ */ jsx("div", { className: "text-muted-foreground py-8 text-center text-xs", children: t("leads.kanban.empty_stage") })
            ] }),
            column.leads.last_page > 1 && /* @__PURE__ */ jsx("div", { className: "border-t px-3 py-2 text-center", children: /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground text-xs", children: [
              column.leads.current_page,
              " / ",
              column.leads.last_page
            ] }) })
          ]
        },
        column.stage.id
      )) })
    ] })
  ] });
}
const __vite_glob_0_32 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: LeadsKanban
}, Symbol.toStringTag, { value: "Module" }));
function LeadShow({ lead, fieldDefs, sources, members, clients, allPipelineStages }) {
  const t = useTranslator();
  const breadcrumbs2 = [
    { title: t("leads.title.index") ?? "Leads", href: route("leads.index") },
    { title: lead.name, href: route("leads.show", lead.id) }
  ];
  function handleDelete() {
    if (!confirm(t("leads.actions.delete") + "?")) return;
    router.delete(route("leads.destroy", lead.id));
  }
  function handleMarkLost() {
    router.post(route("leads.lost", lead.id));
  }
  function handleMarkJunk() {
    router.post(route("leads.junk", lead.id));
  }
  function handleRestore() {
    router.post(route("leads.restore-status", lead.id));
  }
  const isActive = !lead.is_lost && !lead.is_junk && !lead.date_converted;
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: lead.name }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-4 md:p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(PageHeader, { title: lead.name }),
            /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground text-sm", children: [
              "#",
              lead.lead_number
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-2", children: [
            lead.stage && /* @__PURE__ */ jsx(
              Badge,
              {
                variant: "outline",
                style: lead.stage.color ? { borderColor: lead.stage.color, color: lead.stage.color } : void 0,
                children: lead.stage.name
              }
            ),
            lead.is_lost && /* @__PURE__ */ jsx(Badge, { variant: "destructive", children: t("leads.status.lost") }),
            lead.is_junk && /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: t("leads.status.junk") }),
            lead.date_converted && /* @__PURE__ */ jsx(Badge, { variant: "outline", children: t("leads.status.converted") }),
            lead.is_public && /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: t("leads.fields.is_public") })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
          !lead.date_converted && /* @__PURE__ */ jsx(LeadAssignPopover, { lead, members }),
          isActive && /* @__PURE__ */ jsx(LeadConvertDialog, { lead, clients }),
          (isActive || lead.is_lost || lead.is_junk) && /* @__PURE__ */ jsxs(DropdownMenu, { children: [
            /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", children: [
              t("leads.actions.more") ?? "More",
              /* @__PURE__ */ jsx(ChevronDown, { className: "ml-1 h-4 w-4" })
            ] }) }),
            /* @__PURE__ */ jsxs(DropdownMenuContent, { align: "end", children: [
              isActive && /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(DropdownMenuItem, { onClick: handleMarkLost, children: t("leads.actions.mark_lost") }),
                /* @__PURE__ */ jsx(DropdownMenuItem, { onClick: handleMarkJunk, children: t("leads.actions.mark_junk") })
              ] }),
              (lead.is_lost || lead.is_junk) && /* @__PURE__ */ jsx(DropdownMenuItem, { onClick: handleRestore, children: t("leads.actions.restore") })
            ] })
          ] }),
          /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", asChild: true, children: /* @__PURE__ */ jsxs(Link, { href: route("leads.edit", lead.id), children: [
            /* @__PURE__ */ jsx(Pencil, { className: "mr-2 h-4 w-4" }),
            t("leads.actions.edit")
          ] }) }),
          /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "sm", onClick: handleDelete, children: [
            /* @__PURE__ */ jsx(Trash2, { className: "mr-2 h-4 w-4" }),
            t("leads.actions.delete")
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-6 lg:grid-cols-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-4 rounded-lg border p-4", children: [
          lead.company && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
            /* @__PURE__ */ jsx(Building2, { className: "text-muted-foreground h-4 w-4 shrink-0" }),
            lead.company
          ] }),
          lead.email && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
            /* @__PURE__ */ jsx(Mail, { className: "text-muted-foreground h-4 w-4 shrink-0" }),
            /* @__PURE__ */ jsx("a", { href: `mailto:${lead.email}`, className: "hover:underline", children: lead.email })
          ] }),
          lead.phone && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
            /* @__PURE__ */ jsx(Phone, { className: "text-muted-foreground h-4 w-4 shrink-0" }),
            lead.phone
          ] }),
          lead.website && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
            /* @__PURE__ */ jsx(Globe, { className: "text-muted-foreground h-4 w-4 shrink-0" }),
            /* @__PURE__ */ jsx("a", { href: lead.website, target: "_blank", rel: "noopener noreferrer", className: "hover:underline", children: lead.website })
          ] }),
          /* @__PURE__ */ jsx("hr", {}),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-sm", children: [
            lead.assignee && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
                t("leads.fields.assigned_to"),
                ": "
              ] }),
              lead.assignee.name
            ] }),
            lead.pipeline && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
                t("leads.fields.pipeline"),
                ": "
              ] }),
              lead.pipeline.name
            ] }),
            lead.source && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
                t("leads.fields.source"),
                ": "
              ] }),
              lead.source.name
            ] }),
            lead.lead_value && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
                t("leads.fields.lead_value"),
                ": "
              ] }),
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-emerald-600", children: Number(lead.lead_value).toLocaleString() })
            ] }),
            lead.converted_client && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
                t("leads.status.converted"),
                ": "
              ] }),
              /* @__PURE__ */ jsx(Link, { href: route("clients.show", lead.converted_client.id), className: "hover:underline", children: lead.converted_client.name })
            ] })
          ] }),
          fieldDefs.length > 0 && Object.keys(lead.custom_fields).length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("hr", {}),
            /* @__PURE__ */ jsx("div", { className: "space-y-1.5 text-sm", children: fieldDefs.map((def) => {
              const value = lead.custom_fields[def.slug];
              if (value === void 0 || value === null || value === "") return null;
              return /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
                  def.name,
                  ": "
                ] }),
                /* @__PURE__ */ jsx("span", { children: String(value) })
              ] }, def.slug);
            }) })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "lg:col-span-2", children: /* @__PURE__ */ jsxs(Tabs, { defaultValue: "activity", children: [
          /* @__PURE__ */ jsxs(TabsList, { children: [
            /* @__PURE__ */ jsx(TabsTrigger, { value: "activity", children: t("platform.tabs.activity") ?? "Activity" }),
            /* @__PURE__ */ jsx(TabsTrigger, { value: "notes", children: t("platform.tabs.notes") ?? "Notes" }),
            /* @__PURE__ */ jsx(TabsTrigger, { value: "attachments", children: t("platform.tabs.attachments") ?? "Attachments" })
          ] }),
          /* @__PURE__ */ jsx(TabsContent, { value: "activity", className: "mt-4", children: /* @__PURE__ */ jsx(ActivityTimeline, { activities: lead.activities ?? [] }) }),
          /* @__PURE__ */ jsx(TabsContent, { value: "notes", className: "mt-4", children: /* @__PURE__ */ jsx(NoteList, { noteableType: "lead", noteableId: lead.id, notes: lead.notes ?? [] }) }),
          /* @__PURE__ */ jsx(TabsContent, { value: "attachments", className: "mt-4", children: /* @__PURE__ */ jsx(AttachmentList, { attachments: lead.attachments ?? [] }) })
        ] }) })
      ] })
    ] })
  ] });
}
const __vite_glob_0_33 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: LeadShow
}, Symbol.toStringTag, { value: "Module" }));
const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 gap-2",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"
      },
      size: {
        default: "h-10 px-3 min-w-10",
        sm: "h-9 px-2.5 min-w-9",
        lg: "h-11 px-5 min-w-11"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Toggle = React.forwardRef(({ className, variant, size, ...props }, ref) => /* @__PURE__ */ jsx(TogglePrimitive.Root, { ref, className: cn(toggleVariants({ variant, size, className })), ...props }));
Toggle.displayName = TogglePrimitive.Root.displayName;
const ToggleGroupContext = React.createContext({
  size: "default",
  variant: "default"
});
const ToggleGroup = React.forwardRef(({ className, variant, size, children, ...props }, ref) => /* @__PURE__ */ jsx(ToggleGroupPrimitive.Root, { ref, className: cn("flex items-center justify-center gap-1", className), ...props, children: /* @__PURE__ */ jsx(ToggleGroupContext.Provider, { value: { variant, size }, children }) }));
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;
const ToggleGroupItem = React.forwardRef(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);
  return /* @__PURE__ */ jsx(
    ToggleGroupPrimitive.Item,
    {
      ref,
      className: cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size
        }),
        className
      ),
      ...props,
      children
    }
  );
});
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;
const W = 600;
const H = 220;
const series = {
  "90d": [40, 62, 48, 80, 70, 96, 88, 120, 104, 150, 132, 168],
  "30d": [60, 72, 64, 90, 84, 78, 110, 96, 132, 120, 156, 148],
  "7d": [88, 104, 96, 130, 118, 150, 168]
};
const secondary = {
  "90d": [24, 36, 30, 52, 44, 60, 56, 78, 70, 96, 84, 110],
  "30d": [30, 44, 38, 56, 50, 46, 70, 60, 84, 76, 100, 92],
  "7d": [50, 64, 58, 82, 72, 96, 108]
};
const ranges = [
  { key: "90d", labelKey: "platform.dashboard.chart.range_90d" },
  { key: "30d", labelKey: "platform.dashboard.chart.range_30d" },
  { key: "7d", labelKey: "platform.dashboard.chart.range_7d" }
];
function paths(values) {
  const max = Math.max(...values) * 1.15;
  const step = W / (values.length - 1);
  const pts = values.map((v, i) => [i * step, H - v / max * H]);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  return { line, area };
}
function ChartAreaMock() {
  const t = useTranslator();
  const [range, setRange] = useState("90d");
  const a = paths(series[range]);
  const b = paths(secondary[range]);
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-row items-start justify-between gap-2 space-y-0", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid gap-1", children: [
        /* @__PURE__ */ jsx(CardTitle, { children: t("platform.dashboard.chart.title") }),
        /* @__PURE__ */ jsx(CardDescription, { children: t("platform.dashboard.chart.subtitle") })
      ] }),
      /* @__PURE__ */ jsx(
        ToggleGroup,
        {
          type: "single",
          value: range,
          onValueChange: (v) => v && setRange(v),
          variant: "outline",
          className: "hidden sm:flex",
          children: ranges.map((r) => /* @__PURE__ */ jsx(ToggleGroupItem, { value: r.key, className: "px-3 text-xs", children: t(r.labelKey) }, r.key))
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(CardContent, { children: [
      /* @__PURE__ */ jsxs(
        "svg",
        {
          viewBox: `0 0 ${W} ${H}`,
          preserveAspectRatio: "none",
          className: "aspect-[3/1] w-full",
          role: "img",
          "aria-label": t("platform.dashboard.chart.title"),
          children: [
            /* @__PURE__ */ jsxs("defs", { children: [
              /* @__PURE__ */ jsxs("linearGradient", { id: "fill-1", x1: "0", y1: "0", x2: "0", y2: "1", children: [
                /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "var(--chart-1)", stopOpacity: "0.4" }),
                /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "var(--chart-1)", stopOpacity: "0.02" })
              ] }),
              /* @__PURE__ */ jsxs("linearGradient", { id: "fill-2", x1: "0", y1: "0", x2: "0", y2: "1", children: [
                /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "var(--chart-2)", stopOpacity: "0.3" }),
                /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "var(--chart-2)", stopOpacity: "0.02" })
              ] })
            ] }),
            /* @__PURE__ */ jsx("path", { d: b.area, fill: "url(#fill-2)" }),
            /* @__PURE__ */ jsx("path", { d: b.line, fill: "none", stroke: "var(--chart-2)", strokeWidth: "2", vectorEffect: "non-scaling-stroke" }),
            /* @__PURE__ */ jsx("path", { d: a.area, fill: "url(#fill-1)" }),
            /* @__PURE__ */ jsx("path", { d: a.line, fill: "none", stroke: "var(--chart-1)", strokeWidth: "2", vectorEffect: "non-scaling-stroke" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "text-muted-foreground mt-3 flex items-center gap-4 text-xs", children: [
        /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx("span", { className: "bg-chart-1 size-2 rounded-full" }),
          " ",
          t("platform.dashboard.chart.closed")
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx("span", { className: "bg-chart-2 size-2 rounded-full" }),
          " ",
          t("platform.dashboard.chart.forecast")
        ] })
      ] })
    ] })
  ] });
}
const dealStatus = {
  won: { label: "platform.status.won", class: "text-success bg-success/10", icon: CheckCircle2 },
  pending: { label: "platform.status.pending", class: "text-warning bg-warning/10", icon: Clock },
  lost: { label: "platform.status.lost", class: "text-destructive bg-destructive/10", icon: XCircle }
};
function Pill({ meta }) {
  const t = useTranslator();
  const Icon = meta.icon;
  return /* @__PURE__ */ jsxs("span", { className: cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", meta.class), children: [
    /* @__PURE__ */ jsx(Icon, { className: "size-3.5", "aria-hidden": true }),
    t(meta.label)
  ] });
}
function StatusBadge$1({ status }) {
  return /* @__PURE__ */ jsx(Pill, { meta: dealStatus[status] });
}
const deals = [
  { id: "D-1024", name: "Acme Corp - Annual plan", owner: "Linh Tran", stage: "won", value: "₫24.000.000", close: "02/06/2026" },
  { id: "D-1025", name: "Globex onboarding", owner: "Minh Le", stage: "pending", value: "₫8.500.000", close: "19/06/2026" },
  { id: "D-1026", name: "Initech retainer", owner: "Hoa Pham", stage: "pending", value: "₫12.300.000", close: "01/07/2026" },
  { id: "D-1027", name: "Umbrella POC", owner: "Linh Tran", stage: "lost", value: "₫5.000.000", close: "22/05/2026" },
  { id: "D-1028", name: "Soylent expansion", owner: "Minh Le", stage: "won", value: "₫31.200.000", close: "11/06/2026" }
];
const tabs = [
  { key: "all", labelKey: "platform.dashboard.deals.all", rows: deals },
  { key: "pipeline", labelKey: "platform.dashboard.deals.pipeline", rows: deals.filter((d) => d.stage === "pending") },
  { key: "won", labelKey: "platform.dashboard.deals.won", rows: deals.filter((d) => d.stage === "won") },
  { key: "lost", labelKey: "platform.dashboard.deals.lost", rows: deals.filter((d) => d.stage === "lost") }
];
function DealTable({ rows }) {
  const t = useTranslator();
  return /* @__PURE__ */ jsx("div", { className: "overflow-hidden rounded-lg border", children: /* @__PURE__ */ jsxs(Table, { children: [
    /* @__PURE__ */ jsx(TableHeader, { className: "bg-secondary", children: /* @__PURE__ */ jsxs(TableRow, { children: [
      /* @__PURE__ */ jsx(TableHead, { children: t("platform.dashboard.deals.col_deal") }),
      /* @__PURE__ */ jsx(TableHead, { children: t("platform.dashboard.deals.col_owner") }),
      /* @__PURE__ */ jsx(TableHead, { children: t("platform.dashboard.deals.col_stage") }),
      /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: t("platform.dashboard.deals.col_value") }),
      /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: t("platform.dashboard.deals.col_close") })
    ] }) }),
    /* @__PURE__ */ jsx(TableBody, { children: rows.map((d) => /* @__PURE__ */ jsxs(TableRow, { children: [
      /* @__PURE__ */ jsxs(TableCell, { children: [
        /* @__PURE__ */ jsx("div", { className: "font-medium", children: d.name }),
        /* @__PURE__ */ jsx("div", { className: "text-muted-foreground text-xs tabular-nums", children: d.id })
      ] }),
      /* @__PURE__ */ jsx(TableCell, { children: d.owner }),
      /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(StatusBadge$1, { status: d.stage }) }),
      /* @__PURE__ */ jsx(TableCell, { className: "text-right tabular-nums", children: d.value }),
      /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground text-right tabular-nums", children: d.close })
    ] }, d.id)) })
  ] }) });
}
function DataTableMock() {
  const t = useTranslator();
  return /* @__PURE__ */ jsxs(Tabs, { defaultValue: "all", className: "gap-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsx(TabsList, { children: tabs.map((tab) => /* @__PURE__ */ jsx(TabsTrigger, { value: tab.key, children: t(tab.labelKey) }, tab.key)) }),
      /* @__PURE__ */ jsxs(Button, { size: "sm", children: [
        /* @__PURE__ */ jsx(Plus, { className: "size-4" }),
        /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: t("platform.dashboard.deals.new") })
      ] })
    ] }),
    tabs.map((tab) => /* @__PURE__ */ jsx(TabsContent, { value: tab.key, children: /* @__PURE__ */ jsx(DealTable, { rows: tab.rows }) }, tab.key))
  ] });
}
const cards = [
  { key: "revenue", icon: CircleDollarSign, value: "₫1.250.000", delta: 12.5, series: [12, 18, 14, 22, 19, 26, 24, 30] },
  { key: "leads", icon: Users, value: "1.234", delta: -20, series: [40, 36, 38, 30, 28, 24, 22, 18] },
  { key: "deals", icon: Target, value: "486", delta: 12.5, series: [20, 24, 22, 28, 30, 34, 33, 38] },
  { key: "win_rate", icon: TrendingUp, value: "24,5%", delta: 4.5, series: [14, 15, 16, 16, 18, 19, 21, 23] }
];
function SectionCards() {
  const t = useTranslator();
  return /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4", children: cards.map((card) => /* @__PURE__ */ jsx(
    StatCard,
    {
      label: t(`platform.dashboard.kpi.${card.key}`),
      value: card.value,
      icon: card.icon,
      delta: card.delta,
      series: card.series
    },
    card.key
  )) });
}
function Dashboard() {
  const t = useTranslator();
  const breadcrumbs2 = [{ title: t("platform.nav.dashboard"), href: "/dashboard" }];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("platform.dashboard.title") }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-4 md:p-6", children: [
      /* @__PURE__ */ jsx(PageHeader, { title: t("platform.dashboard.title"), description: t("platform.dashboard.description") }),
      /* @__PURE__ */ jsx(SectionCards, {}),
      /* @__PURE__ */ jsx(ChartAreaMock, {}),
      /* @__PURE__ */ jsx(DataTableMock, {})
    ] })
  ] });
}
const __vite_glob_0_34 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Dashboard
}, Symbol.toStringTag, { value: "Module" }));
function MergeFieldPalette({ tokens, onInsert }) {
  const t = useTranslator();
  const entries = Object.entries(tokens);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs font-medium tracking-wide uppercase", children: t("email_templates.merge_fields.title") }),
    /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: t("email_templates.merge_fields.description") }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1", children: [
      entries.map(([key, label]) => /* @__PURE__ */ jsx(
        Button,
        {
          type: "button",
          size: "sm",
          variant: "outline",
          className: "h-7 px-2 py-1 font-mono text-xs",
          onClick: () => onInsert(`{${key}}`),
          title: label,
          children: `{${key}}`
        },
        key
      )),
      /* @__PURE__ */ jsx(
        Button,
        {
          type: "button",
          size: "sm",
          variant: "outline",
          className: "h-7 px-2 py-1 font-mono text-xs",
          onClick: () => onInsert("{company_name}"),
          title: t("email_templates.merge_fields.global.company_name"),
          children: "{company_name}"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          type: "button",
          size: "sm",
          variant: "outline",
          className: "h-7 px-2 py-1 font-mono text-xs",
          onClick: () => onInsert("{current_date}"),
          title: t("email_templates.merge_fields.global.current_date"),
          children: "{current_date}"
        }
      )
    ] })
  ] });
}
function TemplatePreview({ subject, body }) {
  const t = useTranslator();
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs font-medium tracking-wide uppercase", children: t("email_templates.preview.title") }),
    /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: t("email_templates.preview.notice") }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-md border", children: [
      /* @__PURE__ */ jsx("div", { className: "bg-muted/50 border-b px-3 py-2", children: /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: subject || "—" }) }),
      /* @__PURE__ */ jsx(
        "div",
        {
          className: "prose prose-sm max-w-none p-3",
          dangerouslySetInnerHTML: { __html: body }
        }
      )
    ] })
  ] });
}
function HeadingSmall({ title, description }) {
  return /* @__PURE__ */ jsxs("header", { children: [
    /* @__PURE__ */ jsx("h3", { className: "mb-0.5 text-base font-medium", children: title }),
    description && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: description })
  ] });
}
function Heading({ title, description }) {
  return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("div", { className: "mb-8 space-y-0.5", children: [
    /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold tracking-tight", children: title }),
    description && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: description })
  ] }) });
}
function SettingsLayout({ children }) {
  const t = useTranslator();
  const { auth } = usePage().props;
  const can = (permission) => {
    var _a;
    return ((_a = auth.membership) == null ? void 0 : _a.permissions.includes(permission)) ?? false;
  };
  const currentPath = window.location.pathname;
  const navItems = [
    { title: t("platform.nav.profile"), url: "/settings/profile" },
    { title: t("platform.nav.password"), url: "/settings/password" },
    { title: t("platform.nav.appearance"), url: "/settings/appearance" },
    ...can("tenant.workspace.update") ? [{ title: t("platform.nav.workspace"), url: "/settings/workspace" }] : [],
    ...can("tenant.team.manage") ? [{ title: t("platform.nav.teams"), url: "/settings/teams" }] : [],
    ...can("tenant.member.manage") ? [{ title: t("platform.nav.members"), url: "/settings/members" }] : [],
    ...can("tenant.email_template.view") ? [{ title: t("email_templates.title"), url: "/settings/email-templates" }] : [],
    ...can("tenant.workspace.update") ? [
      { title: t("platform.nav.pipelines"), url: "/settings/lookups/pipelines" },
      { title: t("platform.nav.lead_sources"), url: "/settings/lookups/lead-sources" },
      { title: t("platform.nav.project_statuses"), url: "/settings/lookups/project-statuses" }
    ] : [],
    ...can("custom_fields.view") || can("custom_fields.manage") ? [{ title: t("platform.nav.custom_fields"), url: "/settings/custom-fields" }] : [],
    ...can("tenant.client.view") ? [{ title: t("platform.nav.client_groups"), url: "/client-groups" }] : []
  ];
  return /* @__PURE__ */ jsxs("div", { className: "px-4 py-6", children: [
    /* @__PURE__ */ jsx(Heading, { title: t("platform.nav.settings"), description: t("platform.settings.subtitle") }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12", children: [
      /* @__PURE__ */ jsx("aside", { className: "w-full max-w-xl lg:w-48", children: /* @__PURE__ */ jsx("nav", { className: "flex flex-col space-y-1 space-x-0", children: navItems.map((item) => /* @__PURE__ */ jsx(
        Button,
        {
          size: "sm",
          variant: "ghost",
          asChild: true,
          className: cn("w-full justify-start", {
            "bg-muted": currentPath === item.url
          }),
          children: /* @__PURE__ */ jsx(Link, { href: item.url, prefetch: true, children: item.title })
        },
        item.url
      )) }) }),
      /* @__PURE__ */ jsx(Separator, { className: "my-6 md:hidden" }),
      /* @__PURE__ */ jsx("div", { className: "flex-1 md:max-w-2xl", children: /* @__PURE__ */ jsx("section", { className: "max-w-xl space-y-12", children }) })
    ] })
  ] });
}
function EmailTemplateEdit({ template, mergeTokens }) {
  const t = useTranslator();
  const bodyRef = useRef(null);
  const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
    name: template.name,
    subject: template.subject,
    body: template.body,
    plaintext: template.plaintext,
    active: template.active,
    sort_order: template.sort_order
  });
  const {
    data: testData,
    setData: setTestData,
    post: postTest,
    processing: testProcessing
  } = useForm({
    email: ""
  });
  const breadcrumbs2 = [
    { title: t("email_templates.title"), href: "/settings/email-templates" },
    { title: template.name, href: `/settings/email-templates/${template.id}` }
  ];
  const submit = (e) => {
    e.preventDefault();
    patch(route("email-templates.update", template.id), { preserveScroll: true });
  };
  const submitTest = (e) => {
    e.preventDefault();
    postTest(route("email-templates.test", template.id), { preserveScroll: true });
  };
  const insertToken = (token) => {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const newValue = el.value.slice(0, start) + token + el.value.slice(end);
    setData("body", newValue);
    requestAnimationFrame(() => {
      el.setSelectionRange(start + token.length, start + token.length);
      el.focus();
    });
  };
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: template.name }),
    /* @__PURE__ */ jsx(SettingsLayout, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsx(HeadingSmall, { title: template.name, description: `${template.slug} · ${template.language.toUpperCase()}` }),
      /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "name", children: t("email_templates.form.name") }),
          /* @__PURE__ */ jsx(Input, { id: "name", value: data.name, onChange: (e) => setData("name", e.target.value), required: true }),
          /* @__PURE__ */ jsx(InputError, { message: errors.name })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "subject", children: t("email_templates.form.subject") }),
          /* @__PURE__ */ jsx(Input, { id: "subject", value: data.subject, onChange: (e) => setData("subject", e.target.value), required: true }),
          /* @__PURE__ */ jsx(InputError, { message: errors.subject })
        ] }),
        /* @__PURE__ */ jsx(MergeFieldPalette, { tokens: mergeTokens, onInsert: insertToken }),
        /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "body", children: t("email_templates.form.body") }),
          /* @__PURE__ */ jsx(
            Textarea,
            {
              id: "body",
              ref: bodyRef,
              value: data.body,
              onChange: (e) => setData("body", e.target.value),
              rows: 12,
              className: "font-mono text-sm",
              required: true
            }
          ),
          /* @__PURE__ */ jsx(InputError, { message: errors.body })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx(Switch, { id: "active", checked: data.active, onCheckedChange: (checked) => setData("active", checked) }),
          /* @__PURE__ */ jsx(Label, { htmlFor: "active", children: t("email_templates.form.active") })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx(Switch, { id: "plaintext", checked: data.plaintext, onCheckedChange: (checked) => setData("plaintext", checked) }),
          /* @__PURE__ */ jsx(Label, { htmlFor: "plaintext", children: t("email_templates.form.plaintext") })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx(Button, { type: "submit", disabled: processing, children: t("email_templates.actions.save") }),
          recentlySuccessful && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: t("email_templates.updated") })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Separator, {}),
      /* @__PURE__ */ jsx(TemplatePreview, { subject: data.subject, body: data.body }),
      /* @__PURE__ */ jsx(Separator, {}),
      /* @__PURE__ */ jsxs("form", { onSubmit: submitTest, className: "space-y-3", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: t("email_templates.actions.test_send") }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-end gap-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid flex-1 gap-1", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "test_email", children: t("email_templates.form.test_email") }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "test_email",
                type: "email",
                value: testData.email,
                onChange: (e) => setTestData("email", e.target.value),
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsx(Button, { type: "submit", variant: "outline", disabled: testProcessing, children: t("email_templates.actions.test_send") })
        ] })
      ] })
    ] }) })
  ] });
}
const __vite_glob_0_35 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: EmailTemplateEdit
}, Symbol.toStringTag, { value: "Module" }));
function EmailTemplatesIndex({ templates, types }) {
  const t = useTranslator();
  const breadcrumbs2 = [{ title: t("email_templates.title"), href: "/settings/email-templates" }];
  const grouped = types.reduce((acc, type) => {
    acc[type] = templates.filter((tpl) => tpl.type === type);
    return acc;
  }, {});
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("email_templates.title") }),
    /* @__PURE__ */ jsx(SettingsLayout, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsx(HeadingSmall, { title: t("email_templates.title"), description: t("email_templates.subtitle") }),
      types.map((type) => {
        const group = grouped[type] ?? [];
        if (group.length === 0) return null;
        return /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold capitalize", children: t(`email_templates.types.${type}`) }),
          /* @__PURE__ */ jsxs(Table, { children: [
            /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableHead, { children: t("email_templates.columns.name") }),
              /* @__PURE__ */ jsx(TableHead, { children: t("email_templates.columns.subject") }),
              /* @__PURE__ */ jsx(TableHead, { children: t("email_templates.columns.language") }),
              /* @__PURE__ */ jsx(TableHead, { children: t("email_templates.columns.active") }),
              /* @__PURE__ */ jsx(TableHead, { className: "text-right" })
            ] }) }),
            /* @__PURE__ */ jsx(TableBody, { children: group.map((tpl) => /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: tpl.name }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground max-w-xs truncate text-sm", children: tpl.subject }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx("span", { className: "font-mono text-xs uppercase", children: tpl.language }) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: tpl.active ? "default" : "secondary", children: tpl.active ? t("email_templates.statuses.active") : t("email_templates.statuses.inactive") }) }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", variant: "ghost", children: /* @__PURE__ */ jsx(Link, { href: route("email-templates.edit", tpl.id), children: t("email_templates.actions.edit") }) }) })
            ] }, tpl.id)) })
          ] })
        ] }, type);
      })
    ] }) })
  ] });
}
const __vite_glob_0_36 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: EmailTemplatesIndex
}, Symbol.toStringTag, { value: "Module" }));
const CHANNEL_BADGE = {
  zalo_personal: "Z",
  messenger: "M",
  tiktok: "T"
};
function AccountRail({ accounts, totalCount, activeAccountId, onSelect }) {
  const activeAccounts = accounts.filter((acc) => acc.status !== "needs_qr");
  if (activeAccounts.length === 0) return null;
  return /* @__PURE__ */ jsxs("div", { className: "border-b", children: [
    /* @__PURE__ */ jsx(RailRow, { label: "Tất cả hộp thư", count: totalCount, active: activeAccountId === null, onClick: () => onSelect(null) }),
    activeAccounts.map((acc) => /* @__PURE__ */ jsx(
      RailRow,
      {
        label: acc.display_name ?? "Tài khoản chưa đặt tên",
        count: acc.conversations_count,
        active: activeAccountId === acc.id,
        badge: CHANNEL_BADGE[acc.channel] ?? "?",
        needsAttention: acc.status === "session_lost" || acc.status === "needs_qr",
        onClick: () => onSelect(acc.id)
      },
      acc.id
    ))
  ] });
}
function RailRow({
  label,
  count,
  active,
  badge,
  needsAttention,
  onClick
}) {
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      className: cn("hover:bg-muted/50 flex w-full items-center justify-between px-4 py-2 text-sm", active && "bg-muted font-medium"),
      onClick,
      children: [
        /* @__PURE__ */ jsxs("span", { className: "flex min-w-0 items-center gap-2", children: [
          badge && /* @__PURE__ */ jsx("span", { className: "bg-muted-foreground/10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold", children: badge }),
          /* @__PURE__ */ jsx("span", { className: "truncate", children: label }),
          needsAttention && /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 shrink-0 rounded-full bg-red-500", title: "Cần quét lại QR" })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-muted-foreground shrink-0 text-xs", children: count })
      ]
    }
  );
}
const REACTION_PALETTE = ["/-heart", "/-strong", ":>", ":o", ":-((", ":-h"];
const REACTION_ICON_EMOJI = {
  "/-heart": "❤️",
  "/-strong": "👍",
  ":>": "😆",
  ":o": "😮",
  ":-((": "😢",
  ":-h": "😡",
  ":-*": "😘",
  ":')": "🥲",
  "/-ok": "👌",
  "/-rose": "🌹",
  "/-break": "💔",
  "/-weak": "👎",
  ":))": "🤣"
};
function reactionEmoji(icon) {
  return REACTION_ICON_EMOJI[icon] ?? icon;
}
function reactionChips(reactions) {
  const chips = [];
  for (const r of reactions ?? []) {
    const emoji = reactionEmoji(r.icon);
    const hit = chips.find((c) => c.emoji === emoji);
    if (hit) hit.count += 1;
    else chips.push({ emoji, count: 1 });
  }
  return chips;
}
function isStreamMessage(item) {
  return item.item_type === "message";
}
function isOutbound(msg) {
  return msg.direction !== "in";
}
function isGroup(peer) {
  return peer.thread_type === 1;
}
function initials(name) {
  const clean = (name ?? "").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).filter(Boolean);
  const chars = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : clean.slice(0, 2);
  return chars.toUpperCase();
}
function messageTime(msg) {
  const iso = msg.platform_sent_at ?? msg.created_at;
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
function dayLabel(msg) {
  const iso = msg.platform_sent_at ?? msg.created_at;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toDateString() === (/* @__PURE__ */ new Date()).toDateString() ? "Hôm nay" : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function messageBodyIsRedundant(msg) {
  return msg.type === "sticker" || msg.type === "bank_card";
}
function messagePreview(msg) {
  if (!messageBodyIsRedundant(msg) && msg.body && msg.body.trim()) return msg.body;
  switch (msg.type) {
    case "image":
      return "[Hình ảnh]";
    case "gif":
      return "[GIF]";
    case "video":
      return "[Video]";
    case "audio":
      return "[Tin nhắn thoại]";
    case "file":
      return "[Tệp đính kèm]";
    case "sticker":
      return "[Sticker]";
    case "business_card":
      return "[Danh thiếp]";
    case "bank_card":
      return "[Tài khoản ngân hàng]";
    case "call":
      return "[Cuộc gọi]";
    default:
      return "";
  }
}
function ChatAvatar({ name, src, className }) {
  return /* @__PURE__ */ jsxs(Avatar, { className: cn("h-8 w-8", className), children: [
    src ? /* @__PURE__ */ jsx(AvatarImage, { src, alt: name ?? "" }) : null,
    /* @__PURE__ */ jsx(AvatarFallback, { className: "text-[11px]", children: initials(name) })
  ] });
}
function formatTime(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
function GapMarker({ event }) {
  var _a;
  if (event.kind === "group_system" || event.kind === "friend_system") {
    return /* @__PURE__ */ jsx("div", { className: "my-2 flex items-center justify-center", children: /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground flex items-center gap-1.5 text-[11px]", children: [
      /* @__PURE__ */ jsx(Info, { className: "h-3 w-3" }),
      ((_a = event.payload) == null ? void 0 : _a.label) ?? "Sự kiện hệ thống",
      " · ",
      formatTime(event.stream_at)
    ] }) });
  }
  const start = formatTime(event.gap_started_at);
  const end = event.gap_ended_at ? formatTime(event.gap_ended_at) : null;
  return /* @__PURE__ */ jsx("div", { className: "my-3 flex items-center justify-center", children: /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-500", children: [
    /* @__PURE__ */ jsx(AlertTriangle, { className: "h-3 w-3" }),
    "Có thể thiếu tin nhắn · ",
    start,
    end ? ` – ${end}` : ""
  ] }) });
}
function TypeLabel({ text }) {
  return /* @__PURE__ */ jsx("span", { className: "text-xs opacity-70", children: text });
}
function AudioMessage({ msg }) {
  if (!msg.media_url) return /* @__PURE__ */ jsx(TypeLabel, { text: "[Tin nhắn thoại]" });
  return /* @__PURE__ */ jsx("audio", { src: msg.media_url, controls: true, className: "max-w-[220px]" });
}
function BankCardMessage({ msg }) {
  var _a;
  const card = (_a = msg.media_meta) == null ? void 0 : _a.bank_card;
  const [copied, setCopied] = useState(false);
  if (!card || !card.account_number && !card.bank_name) {
    return /* @__PURE__ */ jsx(TypeLabel, { text: "[Tài khoản ngân hàng]" });
  }
  const copyAccountNumber = () => {
    if (!card.account_number || !navigator.clipboard) return;
    navigator.clipboard.writeText(card.account_number).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {
    });
  };
  return /* @__PURE__ */ jsxs("div", { className: "w-72 max-w-full rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-3.5 text-white shadow-md", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      card.logo_url ? /* @__PURE__ */ jsx("img", { src: card.logo_url, alt: "", className: "h-8 w-8 shrink-0 rounded-md bg-white object-contain p-0.5", loading: "lazy" }) : /* @__PURE__ */ jsx("span", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10", children: /* @__PURE__ */ jsx(Landmark, { className: "h-4.5 w-4.5" }) }),
      /* @__PURE__ */ jsx("span", { className: "text-sm leading-tight font-medium", children: card.bank_name ?? "Tài khoản ngân hàng" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-end justify-between gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
        card.account_number && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx("span", { className: "font-mono text-base font-semibold tracking-wider", children: card.account_number }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: copyAccountNumber,
              className: "rounded p-1 opacity-70 transition-opacity hover:bg-white/10 hover:opacity-100",
              "aria-label": "Sao chép số tài khoản",
              title: "Sao chép số tài khoản",
              children: copied ? /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5 text-emerald-400" }) : /* @__PURE__ */ jsx(Copy, { className: "h-3.5 w-3.5" })
            }
          )
        ] }),
        card.account_holder && /* @__PURE__ */ jsx("div", { className: "mt-0.5 truncate text-xs text-white/70", children: card.account_holder })
      ] }),
      card.qr_url && /* @__PURE__ */ jsx("a", { href: card.qr_url, target: "_blank", rel: "noreferrer", className: "shrink-0", title: "Mở ảnh QR", children: /* @__PURE__ */ jsx(
        "img",
        {
          src: card.qr_url,
          alt: "VietQR chuyển khoản",
          className: "h-20 w-20 rounded-md border-2 border-white/25 bg-white object-contain",
          loading: "lazy"
        }
      ) })
    ] })
  ] });
}
function BusinessCardMessage({ msg }) {
  var _a;
  const card = ((_a = msg.media_meta) == null ? void 0 : _a.business_card) ?? {};
  return /* @__PURE__ */ jsxs("div", { className: "flex min-w-[220px] items-center gap-3", children: [
    card.thumbnail ? /* @__PURE__ */ jsx("img", { src: card.thumbnail, alt: card.name ?? "Danh thiếp", className: "h-10 w-10 shrink-0 rounded-full object-cover", loading: "lazy" }) : /* @__PURE__ */ jsx("span", { className: "bg-background/80 flex h-10 w-10 shrink-0 items-center justify-center rounded-full", children: /* @__PURE__ */ jsx(Contact, { className: "h-5 w-5 opacity-80" }) }),
    /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1 leading-tight", children: [
      /* @__PURE__ */ jsx("div", { className: "truncate font-medium", children: card.name ?? "Danh thiếp" }),
      card.title && /* @__PURE__ */ jsx("div", { className: "truncate text-xs opacity-70", children: card.title }),
      card.phone && /* @__PURE__ */ jsx("div", { className: "text-xs opacity-80", children: card.phone }),
      card.url && /* @__PURE__ */ jsx("a", { href: card.url, target: "_blank", rel: "noreferrer", className: "text-xs underline opacity-80 hover:opacity-100", children: "Xem trên Zalo" })
    ] }),
    card.qr_code_url && /* @__PURE__ */ jsx("a", { href: card.qr_code_url, target: "_blank", rel: "noreferrer", className: "shrink-0", children: /* @__PURE__ */ jsx("img", { src: card.qr_code_url, alt: "QR danh thiếp", className: "h-14 w-14 rounded bg-white object-contain p-0.5", loading: "lazy" }) })
  ] });
}
function formatDuration$1(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
function callSummary(call) {
  const video = call.media === "video" || call.type === 2 || call.type === "video";
  const seconds = call.duration_seconds ?? call.duration ?? 0;
  const outcome = call.outcome ?? (seconds > 0 ? "completed" : "missed");
  const kind = video ? "video" : "thoại";
  switch (outcome) {
    case "completed":
      return { label: `Cuộc gọi ${kind} · ${formatDuration$1(seconds)}`, missed: false, video };
    case "busy":
      return { label: `Cuộc gọi ${kind} · máy bận`, missed: true, video };
    case "canceled":
      return { label: `Cuộc gọi ${kind} đã hủy`, missed: true, video };
    default:
      return { label: `Cuộc gọi ${kind} nhỡ`, missed: true, video };
  }
}
function CallMessage({ msg }) {
  var _a;
  const { label, missed, video } = callSummary(((_a = msg.media_meta) == null ? void 0 : _a.call) ?? {});
  const Icon = missed ? PhoneMissed : video ? Video : Phone;
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsx(Icon, { className: cn("h-4 w-4", missed ? "text-red-400" : "opacity-80") }),
    /* @__PURE__ */ jsx("span", { children: label })
  ] });
}
function FileMessage({ msg, mine }) {
  var _a;
  const name = ((_a = msg.media_meta) == null ? void 0 : _a.media_filename) ?? "Tệp đính kèm";
  const dotIndex = name.lastIndexOf(".");
  const extension = dotIndex > 0 && dotIndex < name.length - 1 ? name.slice(dotIndex + 1).toUpperCase() : null;
  return /* @__PURE__ */ jsxs(
    "a",
    {
      href: msg.media_url ?? "#",
      target: "_blank",
      rel: "noreferrer",
      className: cn("flex items-center gap-2.5", mine ? "text-primary-foreground" : "text-foreground"),
      children: [
        /* @__PURE__ */ jsx("span", { className: cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", mine ? "bg-white/15" : "bg-background/80"), children: /* @__PURE__ */ jsx(FileText, { className: "h-5 w-5 opacity-80" }) }),
        /* @__PURE__ */ jsxs("span", { className: "min-w-0 leading-tight", children: [
          /* @__PURE__ */ jsx("span", { className: "block max-w-[200px] truncate font-medium", children: name }),
          /* @__PURE__ */ jsx("span", { className: "block text-xs opacity-70", children: extension ? `${extension} · Bấm để tải` : "Bấm để tải" })
        ] }),
        /* @__PURE__ */ jsx(Download, { className: "h-4 w-4 shrink-0 opacity-60" })
      ]
    }
  );
}
function ImageMessage({ msg }) {
  if (!msg.media_url) return /* @__PURE__ */ jsx(TypeLabel, { text: msg.type === "gif" ? "[GIF]" : "[Hình ảnh]" });
  return /* @__PURE__ */ jsx("a", { href: msg.media_url, target: "_blank", rel: "noreferrer", className: "block", children: /* @__PURE__ */ jsx(
    "img",
    {
      src: msg.media_url,
      alt: msg.body ?? "image",
      className: "max-h-72 max-w-full rounded-lg object-cover",
      loading: "lazy",
      decoding: "async"
    }
  ) });
}
function StickerMessage({ msg }) {
  var _a;
  const sticker = (_a = msg.media_meta) == null ? void 0 : _a.sticker;
  const url = (sticker == null ? void 0 : sticker.url) ?? (sticker == null ? void 0 : sticker.thumbnail) ?? msg.media_url;
  if (!url) return /* @__PURE__ */ jsx(TypeLabel, { text: "[Sticker]" });
  return /* @__PURE__ */ jsx("img", { src: url, alt: (sticker == null ? void 0 : sticker.description) ?? "sticker", className: "h-28 w-28 object-contain", loading: "lazy" });
}
function VideoMessage({ msg }) {
  if (!msg.media_url) return /* @__PURE__ */ jsx(TypeLabel, { text: "[Video]" });
  return /* @__PURE__ */ jsx("video", { src: msg.media_url, controls: true, preload: "none", className: "max-h-72 max-w-full rounded-lg" });
}
function attachmentIsBare(msg) {
  return msg.type === "sticker" || msg.type === "image" || msg.type === "gif" || msg.type === "video" || msg.type === "bank_card";
}
function MessageAttachment({ msg, mine }) {
  switch (msg.type) {
    case "sticker":
      return /* @__PURE__ */ jsx(StickerMessage, { msg });
    case "image":
    case "gif":
      return /* @__PURE__ */ jsx(ImageMessage, { msg });
    case "video":
      return /* @__PURE__ */ jsx(VideoMessage, { msg });
    case "audio":
      return /* @__PURE__ */ jsx(AudioMessage, { msg });
    case "file":
      return /* @__PURE__ */ jsx(FileMessage, { msg, mine });
    case "business_card":
      return /* @__PURE__ */ jsx(BusinessCardMessage, { msg });
    case "bank_card":
      return /* @__PURE__ */ jsx(BankCardMessage, { msg });
    case "call":
      return /* @__PURE__ */ jsx(CallMessage, { msg });
    default:
      return null;
  }
}
function quoteLabel(quote) {
  if (quote.text && quote.text.trim()) return quote.text;
  const t = `${quote.attach_type ?? ""} ${quote.msg_type ?? ""}`;
  if (/photo|image|gif/i.test(t)) return "[Hình ảnh]";
  if (/video/i.test(t)) return "[Video]";
  if (/voice|audio/i.test(t)) return "[Tin nhắn thoại]";
  if (/file/i.test(t)) return "[Tệp đính kèm]";
  if (/sticker/i.test(t) || quote.sticker_ref) return "[Sticker]";
  return quote.thumb ? "[Hình ảnh]" : "Tin được trả lời";
}
function MessageQuote({ quote, mine }) {
  var _a;
  const sender = quote.sender_name ?? ((_a = quote.sender) == null ? void 0 : _a.name) ?? null;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: cn(
        "mb-1 flex items-center gap-2 rounded border-l-2 py-0.5 pr-2 pl-2 text-xs",
        mine ? "border-primary-foreground/50 bg-primary-foreground/10 text-primary-foreground/85" : "border-foreground/30 bg-foreground/5 text-muted-foreground"
      ),
      children: [
        quote.thumb && /* @__PURE__ */ jsx("img", { src: quote.thumb, alt: "", className: "h-9 w-9 shrink-0 rounded object-cover", loading: "lazy", decoding: "async" }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
          sender && /* @__PURE__ */ jsx("div", { className: "font-medium", children: sender }),
          /* @__PURE__ */ jsx("div", { className: "line-clamp-2 break-words opacity-90", children: quoteLabel(quote) })
        ] })
      ]
    }
  );
}
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/;
const IMAGE_URL_PATTERN = /\.(png|jpe?g|gif|webp)($|\?)/i;
const LINK_DISPLAY_MAX = 64;
const LINK_DISPLAY_HEAD = 48;
function truncateUrlForDisplay(url) {
  if (url.length <= LINK_DISPLAY_MAX) return url;
  return `${url.slice(0, LINK_DISPLAY_HEAD)}…${url.slice(-12)}`;
}
function LinkifiedText({ text }) {
  const cleaned = text.replace(/^\[Link\]\s*/, "");
  const parts = cleaned.split(URL_PATTERN);
  if (parts.length === 1) return /* @__PURE__ */ jsx(Fragment, { children: cleaned });
  return /* @__PURE__ */ jsx(Fragment, { children: parts.map((part, index) => {
    var _a;
    if (!part.startsWith("http://") && !part.startsWith("https://")) {
      return /* @__PURE__ */ jsx(Fragment$1, { children: part }, index);
    }
    const trailing = ((_a = part.match(TRAILING_PUNCTUATION)) == null ? void 0 : _a[0]) ?? "";
    const url = trailing ? part.slice(0, -trailing.length) : part;
    return /* @__PURE__ */ jsxs(Fragment$1, { children: [
      IMAGE_URL_PATTERN.test(url) ? /* @__PURE__ */ jsx(ImageLink, { url }) : /* @__PURE__ */ jsx(
        "a",
        {
          href: url,
          target: "_blank",
          rel: "noreferrer",
          title: url,
          className: "underline underline-offset-2 opacity-90 hover:opacity-100",
          children: truncateUrlForDisplay(url)
        }
      ),
      trailing
    ] }, index);
  }) });
}
function ImageLink({ url }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return /* @__PURE__ */ jsx("a", { href: url, target: "_blank", rel: "noreferrer", className: "underline underline-offset-2 opacity-90 hover:opacity-100", children: url });
  }
  return /* @__PURE__ */ jsx("a", { href: url, target: "_blank", rel: "noreferrer", className: "block w-fit", children: /* @__PURE__ */ jsx(
    "img",
    {
      src: url,
      alt: "",
      className: "my-1 max-h-72 max-w-full rounded-lg object-contain",
      loading: "lazy",
      decoding: "async",
      onError: () => setFailed(true)
    }
  ) });
}
function MessageBubble({ msg, peer, showSender, onReply, onReact }) {
  var _a, _b;
  const mine = isOutbound(msg);
  const group = isGroup(peer);
  const recalled = !!msg.recalled_at;
  const hasBody = !messageBodyIsRedundant(msg) && !!(msg.body && msg.body.trim());
  const quote = ((_a = msg.media_meta) == null ? void 0 : _a.quote) ?? null;
  const bare = !recalled && attachmentIsBare(msg) && !hasBody && !quote;
  const hasMedia = msg.type !== "text";
  const chips = reactionChips(msg.reactions);
  const [showPalette, setShowPalette] = useState(false);
  const canInteract = !recalled && msg.quotable === true;
  const participant = group && msg.sender_uid ? (_b = peer.participants) == null ? void 0 : _b[msg.sender_uid] : null;
  const senderName = group ? msg.sender_name ?? (participant == null ? void 0 : participant.name) ?? peer.peer_name : peer.peer_name;
  const senderAvatar = group ? (participant == null ? void 0 : participant.avatar) ?? null : peer.peer_avatar_url;
  return /* @__PURE__ */ jsxs("div", { className: cn("group flex w-full gap-2", mine ? "justify-end" : "justify-start"), children: [
    !mine && /* @__PURE__ */ jsx("div", { className: "w-8 shrink-0 self-end", children: showSender ? /* @__PURE__ */ jsx(ChatAvatar, { name: senderName, src: senderAvatar }) : null }),
    mine && canInteract && (onReply || onReact) && /* @__PURE__ */ jsx(BubbleActions, { msg, onReply, onReact, showPalette, setShowPalette }),
    /* @__PURE__ */ jsxs("div", { className: cn("flex max-w-[72%] min-w-0 flex-col", mine ? "items-end" : "items-start"), children: [
      !mine && group && showSender && senderName && /* @__PURE__ */ jsx("span", { className: "text-muted-foreground mb-0.5 px-1 text-xs", children: senderName }),
      /* @__PURE__ */ jsx(
        "div",
        {
          className: cn(
            "w-fit max-w-full text-sm",
            bare ? "p-0" : cn("rounded-2xl px-3 py-2", mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"),
            msg.pending && "opacity-70"
          ),
          children: recalled ? (
            // P03 — tin thu hồi: ẩn body/media, dòng italic trung tính
            /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-1 italic opacity-70", children: [
              /* @__PURE__ */ jsx(Ban, { className: "h-3.5 w-3.5" }),
              " Tin nhắn đã được thu hồi"
            ] })
          ) : /* @__PURE__ */ jsxs(Fragment, { children: [
            quote && /* @__PURE__ */ jsx(MessageQuote, { quote, mine }),
            /* @__PURE__ */ jsx(MessageAttachment, { msg, mine }),
            hasBody && // overflow-wrap:anywhere (không phải break-word): tính cả vào intrinsic min-content
            // → URL dài không phá width; break-word chỉ bẻ khi render, không chặn nong khung
            /* @__PURE__ */ jsx("p", { className: cn("[overflow-wrap:anywhere] whitespace-pre-wrap", hasMedia && !bare ? "mt-1" : ""), children: /* @__PURE__ */ jsx(LinkifiedText, { text: msg.body }) })
          ] })
        }
      ),
      chips.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-0.5 flex gap-1 px-1", children: chips.map((c) => /* @__PURE__ */ jsxs("span", { className: "bg-muted rounded-full border px-1.5 py-0.5 text-[11px] leading-none", children: [
        c.emoji,
        c.count > 1 && /* @__PURE__ */ jsx("span", { className: "text-muted-foreground ml-0.5", children: c.count })
      ] }, c.emoji)) }),
      /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground mt-0.5 flex items-center gap-1 px-1 text-[10px]", children: [
        messageTime(msg),
        mine && msg.pending && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-0.5 opacity-80", children: [
          /* @__PURE__ */ jsx(Clock3, { className: "h-3 w-3" }),
          " Đang gửi"
        ] }),
        mine && !group && !recalled && !msg.pending && (msg.seen_at ? /* @__PURE__ */ jsxs("span", { className: "text-primary flex items-center gap-0.5", children: [
          /* @__PURE__ */ jsx(CheckCheck, { className: "h-3 w-3" }),
          " Đã xem"
        ] }) : msg.delivered_at ? /* @__PURE__ */ jsx(CheckCheck, { className: "h-3 w-3" }) : msg.source_id ? /* @__PURE__ */ jsx(Check, { className: "h-3 w-3" }) : null)
      ] })
    ] }),
    !mine && canInteract && (onReply || onReact) && /* @__PURE__ */ jsx(BubbleActions, { msg, onReply, onReact, showPalette, setShowPalette })
  ] });
}
function BubbleActions({
  msg,
  onReply,
  onReact,
  showPalette,
  setShowPalette
}) {
  return /* @__PURE__ */ jsxs("div", { className: "relative flex items-center gap-0.5 self-center opacity-0 transition-opacity group-hover:opacity-100", children: [
    onReply && /* @__PURE__ */ jsx("button", { type: "button", className: "text-muted-foreground hover:bg-muted rounded p-1", onClick: () => onReply(msg), "aria-label": "Trả lời", children: /* @__PURE__ */ jsx(Reply, { className: "h-3.5 w-3.5" }) }),
    onReact && /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: "text-muted-foreground hover:bg-muted rounded p-1",
        onClick: () => setShowPalette(!showPalette),
        "aria-label": "Thả cảm xúc",
        children: /* @__PURE__ */ jsx(SmilePlus, { className: "h-3.5 w-3.5" })
      }
    ),
    showPalette && onReact && /* @__PURE__ */ jsx("div", { className: "bg-popover absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-full border px-2 py-1 shadow-md", children: REACTION_PALETTE.map((icon) => /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: "hover:scale-125",
        onClick: () => {
          setShowPalette(false);
          onReact(msg, icon);
        },
        children: reactionEmoji(icon)
      },
      icon
    )) })
  ] });
}
const NEAR_BOTTOM_PX = 160;
const LOAD_MORE_THRESHOLD_PX = 80;
function ChatThread({ items, peer, loading, hasMore, loadingMore, onLoadMore, onReply, onReact }) {
  const containerRef = useRef(null);
  const anchorRef = useRef({
    firstId: null,
    lastId: null,
    scrollHeight: 0
  });
  useLayoutEffect(() => {
    if (items.length === 0) {
      anchorRef.current = { firstId: null, lastId: null, scrollHeight: 0 };
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const firstId = items[0].id;
    const lastItem = items[items.length - 1];
    const prev = anchorRef.current;
    if (lastItem.id !== prev.lastId) {
      if (prev.lastId === null) {
        el.scrollTop = el.scrollHeight;
      } else {
        const nearBottom = prev.scrollHeight - (el.scrollTop + el.clientHeight) < NEAR_BOTTOM_PX;
        if (nearBottom || isStreamMessage(lastItem) && isOutbound(lastItem)) {
          el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        }
      }
    } else if (firstId !== prev.firstId) {
      el.scrollTop += el.scrollHeight - prev.scrollHeight;
    }
    anchorRef.current = { firstId, lastId: lastItem.id, scrollHeight: el.scrollHeight };
    if (hasMore && !loadingMore && el.scrollHeight <= el.clientHeight) {
      onLoadMore == null ? void 0 : onLoadMore();
    }
  }, [items]);
  function handleScroll(e) {
    if (hasMore && !loadingMore && e.currentTarget.scrollTop < LOAD_MORE_THRESHOLD_PX) {
      onLoadMore == null ? void 0 : onLoadMore();
    }
  }
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "flex-1 space-y-3 overflow-y-auto p-4", children: [0, 1, 2].map((i) => /* @__PURE__ */ jsxs("div", { className: i % 2 ? "flex justify-end" : "flex justify-start gap-2", children: [
      i % 2 === 0 && /* @__PURE__ */ jsx(Skeleton, { className: "h-8 w-8 rounded-full" }),
      /* @__PURE__ */ jsx(Skeleton, { className: "h-10 w-48 rounded-2xl" })
    ] }, i)) });
  }
  if (items.length === 0) {
    return /* @__PURE__ */ jsxs("div", { className: "text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 p-4 text-sm", children: [
      /* @__PURE__ */ jsx(MessageCircle, { className: "h-8 w-8 opacity-30" }),
      "Chưa có tin nhắn nào."
    ] });
  }
  let lastDay = "";
  let lastMessage = null;
  return /* @__PURE__ */ jsxs("div", { ref: containerRef, onScroll: handleScroll, className: "flex-1 space-y-1 overflow-y-auto p-4", children: [
    loadingMore && /* @__PURE__ */ jsx("div", { className: "text-muted-foreground py-1 text-center text-[11px]", children: "Đang tải tin cũ hơn…" }),
    items.map((item) => {
      if (!isStreamMessage(item)) {
        lastMessage = null;
        return /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(GapMarker, { event: item }) }, item.id);
      }
      const day = dayLabel(item);
      const showDay = day !== lastDay;
      lastDay = day;
      const showSender = showDay || !lastMessage || isOutbound(lastMessage) !== isOutbound(item) || (lastMessage.sender_uid ?? null) !== (item.sender_uid ?? null);
      lastMessage = item;
      return /* @__PURE__ */ jsxs("div", { children: [
        showDay && /* @__PURE__ */ jsx("div", { className: "text-muted-foreground my-3 text-center text-[11px]", children: /* @__PURE__ */ jsx("span", { className: "bg-muted rounded-full px-2 py-0.5", children: day }) }),
        /* @__PURE__ */ jsx("div", { className: showSender ? "mt-2" : "", children: /* @__PURE__ */ jsx(MessageBubble, { msg: item, peer, showSender, onReply, onReact }) })
      ] }, item.id);
    })
  ] });
}
const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
const Alert = React.forwardRef(
  ({ className, variant, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, role: "alert", className: cn(alertVariants({ variant }), className), ...props })
);
Alert.displayName = "Alert";
const AlertTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("h5", { ref, className: cn("mb-1 font-medium leading-none tracking-tight", className), ...props }));
AlertTitle.displayName = "AlertTitle";
const AlertDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("text-sm [&_p]:leading-relaxed", className), ...props }));
AlertDescription.displayName = "AlertDescription";
function ConnectionBanner({ accounts }) {
  const needsAttention = accounts.filter((acc) => acc.status === "session_lost" || acc.status === "needs_qr");
  if (needsAttention.length === 0) return null;
  return /* @__PURE__ */ jsx(Fragment, { children: needsAttention.map((acc) => /* @__PURE__ */ jsxs(Alert, { variant: acc.status === "session_lost" ? "destructive" : "default", className: "rounded-none border-x-0 px-3 py-2", children: [
    /* @__PURE__ */ jsx(AlertTriangle, { className: "h-4 w-4" }),
    /* @__PURE__ */ jsxs(AlertDescription, { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("span", { children: [
        "Tài khoản ",
        /* @__PURE__ */ jsx("strong", { children: acc.display_name ?? "Zalo" }),
        " ",
        acc.status === "session_lost" ? "mất kết nối. Tin nhắn mới có thể chưa nhận được." : "chưa kết nối.",
        " Cần quét lại QR."
      ] }),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "sm",
          variant: "outline",
          className: "ml-3 h-7 shrink-0",
          onClick: () => router.visit(route("integrations.zalo.index")),
          children: "Quét QR"
        }
      )
    ] })
  ] }, acc.id)) });
}
function xsrf() {
  var _a;
  return decodeURIComponent(((_a = document.cookie.match(/XSRF-TOKEN=([^;]+)/)) == null ? void 0 : _a[1]) ?? "");
}
const JSON_HEADERS = () => ({
  "X-Requested-With": "XMLHttpRequest",
  Accept: "application/json",
  "Content-Type": "application/json",
  "X-XSRF-TOKEN": xsrf()
});
function ConversationPanel({ conversationId }) {
  var _a;
  const [data, setData] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState(false);
  const reload = useCallback(() => {
    fetch(route("inbox.panel", conversationId), {
      headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" }
    }).then((r) => r.json()).then(setData).catch(() => {
    });
  }, [conversationId]);
  useEffect(reload, [reload]);
  function assign(userId) {
    setBusy(true);
    fetch(route("inbox.assign", conversationId), {
      method: "PATCH",
      headers: JSON_HEADERS(),
      body: JSON.stringify({ user_id: userId })
    }).then(async (r) => {
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(json.message ?? "Không gán được.");
        return;
      }
      setData((prev) => prev ? { ...prev, assigned_user: json.assigned_user } : prev);
    }).catch(() => alert("Không kết nối được server.")).finally(() => setBusy(false));
  }
  function syncTags(names) {
    setBusy(true);
    fetch(route("tags.sync"), {
      method: "POST",
      headers: JSON_HEADERS(),
      body: JSON.stringify({ attachable_type: "conversation", attachable_id: conversationId, tags: names })
    }).then((r) => {
      if (r.status === 403) alert("Bạn không có quyền quản lý label.");
      reload();
    }).catch(() => alert("Không kết nối được server.")).finally(() => setBusy(false));
  }
  function addNote() {
    const body = noteInput.trim();
    if (!body) return;
    setBusy(true);
    fetch(route("notes.store"), {
      method: "POST",
      headers: JSON_HEADERS(),
      body: JSON.stringify({ noteable_type: "conversation", noteable_id: conversationId, body })
    }).then(() => {
      setNoteInput("");
      reload();
    }).catch(() => alert("Không kết nối được server.")).finally(() => setBusy(false));
  }
  if (!data) return null;
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4 border-t pt-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground flex items-center gap-1 text-xs font-medium", children: [
        /* @__PURE__ */ jsx(UserCheck, { className: "h-3.5 w-3.5" }),
        " Phụ trách"
      ] }),
      /* @__PURE__ */ jsxs(
        "select",
        {
          className: "border-input bg-background h-8 w-full rounded-md border px-2 text-xs",
          value: ((_a = data.assigned_user) == null ? void 0 : _a.id) ?? "",
          disabled: busy,
          onChange: (e) => assign(e.target.value === "" ? null : Number(e.target.value)),
          children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "— Chưa gán —" }),
            data.members.map((m) => /* @__PURE__ */ jsx("option", { value: m.id, children: m.name }, m.id))
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground flex items-center gap-1 text-xs font-medium", children: [
        /* @__PURE__ */ jsx(Tag, { className: "h-3.5 w-3.5" }),
        " Label"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1", children: data.tags.map((t) => /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "rounded-full border px-2 py-0.5 text-[11px] hover:line-through",
          style: t.color ? { borderColor: t.color, color: t.color } : void 0,
          title: "Bấm để gỡ",
          disabled: busy,
          onClick: () => syncTags(data.tags.filter((x) => x.id !== t.id).map((x) => x.name)),
          children: t.name
        },
        t.id
      )) }),
      /* @__PURE__ */ jsxs(
        "form",
        {
          onSubmit: (e) => {
            e.preventDefault();
            const name = tagInput.trim();
            if (!name) return;
            setTagInput("");
            syncTags([...data.tags.map((t) => t.name), name]);
          },
          className: "flex gap-1",
          children: [
            /* @__PURE__ */ jsx(Input, { value: tagInput, onChange: (e) => setTagInput(e.target.value), placeholder: "Thêm label...", className: "h-7 text-xs" }),
            /* @__PURE__ */ jsx(Button, { type: "submit", size: "sm", variant: "secondary", className: "h-7 text-xs", disabled: busy || !tagInput.trim(), children: "+" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground flex items-center gap-1 text-xs font-medium", children: [
        /* @__PURE__ */ jsx(StickyNote, { className: "h-3.5 w-3.5" }),
        " Note nội bộ"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "max-h-40 space-y-1 overflow-y-auto", children: data.notes.map((n) => /* @__PURE__ */ jsxs("div", { className: "rounded border border-amber-200 bg-amber-50 p-1.5 text-xs dark:border-amber-900 dark:bg-amber-950", children: [
        /* @__PURE__ */ jsx("p", { className: "whitespace-pre-wrap", children: n.body }),
        /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground mt-0.5 text-[10px]", children: [
          n.author_name,
          " · ",
          new Date(n.created_at).toLocaleString("vi-VN")
        ] })
      ] }, n.id)) }),
      /* @__PURE__ */ jsxs(
        "form",
        {
          onSubmit: (e) => {
            e.preventDefault();
            addNote();
          },
          className: "flex gap-1",
          children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                value: noteInput,
                onChange: (e) => setNoteInput(e.target.value),
                placeholder: "Ghi chú riêng cho team...",
                className: "h-7 text-xs"
              }
            ),
            /* @__PURE__ */ jsx(Button, { type: "submit", size: "sm", variant: "secondary", className: "h-7 text-xs", disabled: busy || !noteInput.trim(), children: "Lưu" })
          ]
        }
      )
    ] })
  ] });
}
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
function xsrfToken() {
  var _a;
  return decodeURIComponent(((_a = document.cookie.match(/XSRF-TOKEN=([^;]+)/)) == null ? void 0 : _a[1]) ?? "");
}
function notify(msg) {
  alert(msg);
}
function MessageComposer({
  conversationId,
  disabled,
  onSent,
  onPending,
  onSettled,
  replyTo,
  onClearReply,
  peerName,
  canSendMedia = false,
  canSendSticker = false
}) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [stickerQuery, setStickerQuery] = useState("");
  const [stickerResults, setStickerResults] = useState([]);
  const [stickerLoading, setStickerLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState(null);
  const slashQuery = text.startsWith("/") ? text.slice(1).toLowerCase() : null;
  const slashMatches = slashQuery !== null && quickReplies !== null ? quickReplies.filter((q) => q.title.toLowerCase().includes(slashQuery)).slice(0, 8) : [];
  useEffect(() => {
    if (slashQuery === null || quickReplies !== null) return;
    fetch(route("inbox.quick-replies.index"), {
      headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" }
    }).then((r) => r.json()).then((json) => setQuickReplies(Array.isArray(json) ? json : [])).catch(() => setQuickReplies([]));
  }, [slashQuery, quickReplies]);
  function insertQuickReply(item) {
    setText(item.body.replaceAll("{ten_khach}", peerName ?? "bạn"));
  }
  useEffect(() => {
    return () => {
      if (attachment == null ? void 0 : attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    };
  }, [attachment]);
  function clearAttachment() {
    setAttachment((prev) => {
      if (prev == null ? void 0 : prev.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
  function uploadFile(file) {
    if (file.size > MAX_UPLOAD_BYTES) {
      notify("Tệp vượt giới hạn 20MB.");
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    fetch(route("inbox.attachments.store", conversationId), {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
        "X-XSRF-TOKEN": xsrfToken()
      },
      body: form
    }).then(async (r) => {
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        notify(json.message ?? "Không tải được tệp lên.");
        return;
      }
      clearAttachment();
      setAttachment({
        id: json.attachment_id,
        filename: json.filename,
        mediaKind: json.media_kind,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        file
      });
    }).catch(() => notify("Không kết nối được server.")).finally(() => setUploading(false));
  }
  function handlePaste(e) {
    var _a, _b;
    const file = (_b = (_a = e.clipboardData) == null ? void 0 : _a.files) == null ? void 0 : _b[0];
    if (canSendMedia && file && file.type.startsWith("image/")) {
      e.preventDefault();
      uploadFile(file);
    }
  }
  function restoreComposer(sentText, sentAttachment) {
    setText((current) => current === "" ? sentText : current);
    if (sentAttachment) {
      setAttachment(
        (current) => current ?? {
          ...sentAttachment,
          previewUrl: sentAttachment.file.type.startsWith("image/") ? URL.createObjectURL(sentAttachment.file) : null
        }
      );
    }
  }
  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && !attachment || uploading) return;
    const sentText = trimmed;
    const sentAttachment = attachment;
    const sentReplyToId = (replyTo == null ? void 0 : replyTo.id) ?? null;
    const tempId = `pending-${crypto.randomUUID()}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    onPending({
      id: tempId,
      conversation_id: conversationId,
      direction: "out",
      type: sentAttachment ? sentAttachment.mediaKind : "text",
      body: sentText || null,
      // objectURL riêng cho bubble (parent revoke khi settle) — độc lập preview composer
      media_url: (sentAttachment == null ? void 0 : sentAttachment.file.type.startsWith("image/")) ? URL.createObjectURL(sentAttachment.file) : null,
      media_meta: sentAttachment ? { media_kind: sentAttachment.mediaKind, media_filename: sentAttachment.filename } : null,
      platform_sent_at: now,
      sender_name: null,
      created_at: now,
      pending: true
    });
    setText("");
    clearAttachment();
    onClearReply == null ? void 0 : onClearReply();
    fetch(route("inbox.send", conversationId), {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": xsrfToken()
      },
      body: JSON.stringify({
        text: sentText || null,
        attachment_id: (sentAttachment == null ? void 0 : sentAttachment.id) ?? null,
        reply_to_message_id: sentReplyToId
      })
    }).then(async (r) => {
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        onSettled(tempId, null);
        restoreComposer(sentText, sentAttachment);
        notify(json.message ?? "Không gửi được tin nhắn. Vui lòng thử lại.");
        return;
      }
      onSettled(tempId, json);
    }).catch(() => {
      onSettled(tempId, null);
      restoreComposer(sentText, sentAttachment);
      notify("Không kết nối được server.");
    });
  }
  function searchStickers() {
    const q = stickerQuery.trim();
    if (!q || stickerLoading) return;
    setStickerLoading(true);
    fetch(`${route("inbox.stickers", conversationId)}?q=${encodeURIComponent(q)}`, {
      headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" }
    }).then(async (r) => {
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        notify(json.message ?? "Không tìm được sticker.");
        return;
      }
      setStickerResults(json.stickers ?? []);
    }).catch(() => notify("Không kết nối được server.")).finally(() => setStickerLoading(false));
  }
  function sendSticker(sticker) {
    if (sending) return;
    setSending(true);
    setStickerOpen(false);
    fetch(route("inbox.send", conversationId), {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": xsrfToken()
      },
      body: JSON.stringify({
        sticker: {
          id: sticker.id,
          cate_id: sticker.cateId,
          type: sticker.type,
          url: sticker.url,
          thumbnail: sticker.thumbnail
        }
      })
    }).then(async (r) => {
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        notify(json.message ?? "Không gửi được sticker.");
        return;
      }
      onSent(json);
    }).catch(() => notify("Không kết nối được server.")).finally(() => setSending(false));
  }
  return /* @__PURE__ */ jsxs("div", { className: "border-t", children: [
    replyTo && /* @__PURE__ */ jsxs("div", { className: "border-primary bg-muted/50 mx-3 mt-2 flex items-center gap-2 rounded border-l-2 px-2 py-1", children: [
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-primary text-[11px] font-medium", children: [
          "Trả lời ",
          replyTo.senderName
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-muted-foreground truncate text-xs", children: replyTo.text })
      ] }),
      /* @__PURE__ */ jsx(Button, { type: "button", size: "sm", variant: "ghost", className: "h-6 w-6 p-0", onClick: onClearReply, "aria-label": "Bỏ trả lời", children: /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5" }) })
    ] }),
    stickerOpen && /* @__PURE__ */ jsxs("div", { className: "mx-3 mt-2 rounded border p-2", children: [
      /* @__PURE__ */ jsxs(
        "form",
        {
          onSubmit: (e) => {
            e.preventDefault();
            searchStickers();
          },
          className: "flex gap-1",
          children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                value: stickerQuery,
                onChange: (e) => setStickerQuery(e.target.value),
                placeholder: "Tìm sticker (vd: hello, cảm ơn)...",
                className: "h-7 text-xs",
                autoFocus: true
              }
            ),
            /* @__PURE__ */ jsx(Button, { type: "submit", size: "sm", variant: "secondary", className: "h-7 text-xs", disabled: stickerLoading || !stickerQuery.trim(), children: stickerLoading ? "..." : "Tìm" })
          ]
        }
      ),
      stickerResults.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-2 grid max-h-40 grid-cols-6 gap-1 overflow-y-auto", children: stickerResults.map((s) => /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "hover:bg-muted rounded p-1",
          onClick: () => sendSticker(s),
          disabled: sending,
          children: s.url || s.thumbnail ? /* @__PURE__ */ jsx(
            "img",
            {
              src: s.url ?? s.thumbnail ?? "",
              alt: s.description ?? "sticker",
              className: "h-12 w-12 object-contain",
              loading: "lazy"
            }
          ) : /* @__PURE__ */ jsxs("span", { className: "text-xs", children: [
            "#",
            s.id
          ] })
        },
        s.id
      )) })
    ] }),
    slashMatches.length > 0 && /* @__PURE__ */ jsx("div", { className: "mx-3 mt-2 rounded border", children: slashMatches.map((q) => /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        className: "hover:bg-muted block w-full px-2 py-1.5 text-left",
        onClick: () => insertQuickReply(q),
        children: [
          /* @__PURE__ */ jsxs("span", { className: "text-xs font-medium", children: [
            "/",
            q.title
          ] }),
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground ml-2 truncate text-xs", children: q.body.slice(0, 60) })
        ]
      },
      q.id
    )) }),
    attachment && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 px-3 pt-2", children: [
      attachment.previewUrl ? /* @__PURE__ */ jsx("img", { src: attachment.previewUrl, alt: attachment.filename, className: "h-14 w-14 rounded-md object-cover" }) : /* @__PURE__ */ jsx(FileText, { className: "text-muted-foreground h-8 w-8" }),
      /* @__PURE__ */ jsx("span", { className: "text-muted-foreground max-w-[240px] truncate text-xs", children: attachment.filename }),
      /* @__PURE__ */ jsx(Button, { type: "button", size: "sm", variant: "ghost", className: "h-6 w-6 p-0", onClick: clearAttachment, "aria-label": "Bỏ đính kèm", children: /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5" }) })
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "flex gap-2 p-3", children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          ref: fileInputRef,
          type: "file",
          className: "hidden",
          onChange: (e) => {
            var _a;
            const file = (_a = e.target.files) == null ? void 0 : _a[0];
            if (file) uploadFile(file);
          }
        }
      ),
      canSendMedia && /* @__PURE__ */ jsx(
        Button,
        {
          type: "button",
          size: "sm",
          variant: "ghost",
          disabled: disabled || uploading,
          onClick: () => {
            var _a;
            return (_a = fileInputRef.current) == null ? void 0 : _a.click();
          },
          "aria-label": "Đính kèm tệp",
          children: /* @__PURE__ */ jsx(Paperclip, { className: `h-4 w-4 ${uploading ? "animate-pulse" : ""}` })
        }
      ),
      canSendSticker && /* @__PURE__ */ jsx(
        Button,
        {
          type: "button",
          size: "sm",
          variant: "ghost",
          disabled: disabled || sending,
          onClick: () => setStickerOpen(!stickerOpen),
          "aria-label": "Gửi sticker",
          children: /* @__PURE__ */ jsx(SmilePlus, { className: "h-4 w-4" })
        }
      ),
      /* @__PURE__ */ jsx(
        Input,
        {
          value: text,
          onChange: (e) => setText(e.target.value),
          onPaste: handlePaste,
          placeholder: uploading ? "Đang tải tệp lên..." : "Nhập tin nhắn...",
          className: "flex-1",
          disabled
        }
      ),
      /* @__PURE__ */ jsx(Button, { type: "submit", size: "sm", disabled: disabled || uploading || !text.trim() && !attachment, children: /* @__PURE__ */ jsx(Send, { className: "h-4 w-4" }) })
    ] })
  ] });
}
const ZALO_QUOTA_KEY = "quota.conversations.zalo_personal";
const TYPING_TTL_MS = 8e3;
function showToast(msg) {
  alert(msg);
}
function InboxIndex({
  conversations,
  filters,
  selectedConversation,
  channelAccounts = [],
  seenSyncEnabled = false,
  canManageZalo = false,
  channelCapabilities = {}
}) {
  var _a;
  const { auth, activeWorkspace } = usePage().props;
  const [convList, setConvList] = useState(conversations.data);
  const [activeConv, setActiveConv] = useState(null);
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState(filters.q ?? "");
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [typing, setTyping] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [seenSync, setSeenSync] = useState(seenSyncEnabled);
  const [seenSyncSaving, setSeenSyncSaving] = useState(false);
  function toggleSeenSync() {
    var _a2;
    if (seenSyncSaving) return;
    setSeenSyncSaving(true);
    fetch(route("inbox.settings.seen-sync"), {
      method: "PUT",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": decodeURIComponent(((_a2 = document.cookie.match(/XSRF-TOKEN=([^;]+)/)) == null ? void 0 : _a2[1]) ?? "")
      },
      body: JSON.stringify({ enabled: !seenSync })
    }).then(async (r) => {
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast(json.message ?? "Không đổi được cài đặt.");
        return;
      }
      setSeenSync(json.enabled);
    }).catch(() => showToast("Không kết nối được server.")).finally(() => setSeenSyncSaving(false));
  }
  const activeConvRef = useRef(null);
  const streamVersionRef = useRef(null);
  const lastRefetchRef = useRef(0);
  const unreadWhileHiddenRef = useRef(false);
  function markConversationRead(convId) {
    var _a2;
    setConvList((prev) => prev.map((c) => c.id === convId ? { ...c, unread_count: 0 } : c));
    fetch(route("inbox.read", convId), {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
        "X-XSRF-TOKEN": decodeURIComponent(((_a2 = document.cookie.match(/XSRF-TOKEN=([^;]+)/)) == null ? void 0 : _a2[1]) ?? "")
      }
    }).catch(() => {
    });
  }
  function refetchActiveThread() {
    const conv = activeConvRef.current;
    if (!conv || Date.now() - lastRefetchRef.current < 5e3) return;
    lastRefetchRef.current = Date.now();
    fetch(route("inbox.stream", conv.id), {
      headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" }
    }).then((r) => r.json()).then((responseData) => {
      setItems(responseData.items ?? []);
      setNextCursor(responseData.next_cursor ?? null);
      streamVersionRef.current = responseData.stream_version ?? null;
    }).catch(() => {
    });
  }
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      refetchActiveThread();
      if (unreadWhileHiddenRef.current && activeConvRef.current) {
        unreadWhileHiddenRef.current = false;
        markConversationRead(activeConvRef.current.id);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  function handleResync() {
    var _a2;
    if (syncing) return;
    setSyncing(true);
    fetch(route("inbox.resync"), {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
        "X-XSRF-TOKEN": decodeURIComponent(((_a2 = document.cookie.match(/XSRF-TOKEN=([^;]+)/)) == null ? void 0 : _a2[1]) ?? "")
      }
    }).then(async (r) => {
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast(json.message ?? "Không đồng bộ được. Kiểm tra bridge đã chạy chưa.");
        return;
      }
      showToast("Đã yêu cầu đồng bộ — tin nhắn thiếu sẽ về trong giây lát.");
      router.reload({ only: ["conversations"] });
    }).catch(() => showToast("Không kết nối được server.")).finally(() => setSyncing(false));
  }
  const entitlements = ((_a = auth.membership) == null ? void 0 : _a.entitlements) ?? null;
  const zaloLimit = (entitlements == null ? void 0 : entitlements.quotas[ZALO_QUOTA_KEY]) ?? null;
  const zaloRemaining = (entitlements == null ? void 0 : entitlements.remaining[ZALO_QUOTA_KEY]) ?? null;
  const quotaExhausted = zaloRemaining !== null && zaloRemaining <= 0;
  useEffect(() => {
    setConvList(conversations.data);
  }, [conversations.data]);
  useEffect(() => {
    if (selectedConversation) handleSelectConv(selectedConversation);
  }, []);
  useEffect(() => {
    const workspaceId = activeWorkspace == null ? void 0 : activeWorkspace.id;
    if (!workspaceId || typeof window === "undefined" || !window.Echo) return;
    const channel = window.Echo.private(`workspace.${workspaceId}.conversations`);
    channel.listen("MessageReceived", (payload) => {
      var _a2, _b;
      const { message, conversation_id, last_message_at, unread_count, gap_event } = payload;
      const viewingThisConversation = conversation_id === ((_a2 = activeConvRef.current) == null ? void 0 : _a2.id);
      const readImmediately = viewingThisConversation && document.visibilityState === "visible";
      if (viewingThisConversation && message.direction === "in") {
        if (readImmediately) markConversationRead(conversation_id);
        else unreadWhileHiddenRef.current = true;
      }
      if (conversation_id === ((_b = activeConvRef.current) == null ? void 0 : _b.id) && payload.stream_version != null) {
        const known = streamVersionRef.current;
        if (known != null && payload.stream_version > known + 1) {
          refetchActiveThread();
        } else {
          streamVersionRef.current = payload.stream_version;
        }
      }
      setActiveConv((current) => {
        var _a3;
        if ((current == null ? void 0 : current.id) !== conversation_id) return current;
        setItems((prev) => {
          if (prev.some((it) => it.id === message.id)) return prev;
          const next = gap_event && !prev.some((it) => it.id === gap_event.id) ? [...prev, gap_event] : prev;
          return [...next, { ...message, item_type: "message" }];
        });
        const senderProfile = payload.sender_participant;
        if (!senderProfile || !message.sender_uid) return current;
        const known = (_a3 = current.participants) == null ? void 0 : _a3[message.sender_uid];
        if (known && known.name === senderProfile.name && known.avatar === senderProfile.avatar) return current;
        const merged = { ...current, participants: { ...current.participants, [message.sender_uid]: senderProfile } };
        activeConvRef.current = merged;
        return merged;
      });
      setConvList((prev) => {
        if (!prev.some((c) => c.id === conversation_id)) {
          queueMicrotask(() => router.reload({ only: ["conversations"] }));
          return prev;
        }
        const updated = prev.map(
          (c) => c.id === conversation_id ? { ...c, unread_count: readImmediately ? 0 : unread_count, last_message_at, last_message_preview: messagePreview(message) } : c
        );
        return [...updated].sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));
      });
    });
    channel.listen("MessageStateChanged", (payload) => {
      setItems(
        (prev) => prev.map(
          (item) => isStreamMessage(item) && item.id === payload.message_id ? {
            ...item,
            recalled_at: payload.recalled_at,
            delivered_at: payload.delivered_at,
            seen_at: payload.seen_at,
            reactions: payload.reactions
          } : item
        )
      );
    });
    channel.listen("ConversationTyping", (payload) => {
      setTyping({ convId: payload.conversation_id, until: Date.now() + TYPING_TTL_MS });
    });
    channel.listen("ConversationSystemLine", (payload) => {
      setActiveConv((current) => {
        if ((current == null ? void 0 : current.id) === payload.item.conversation_id) {
          setItems((prev) => prev.some((it) => it.id === payload.item.id) ? prev : [...prev, payload.item]);
        }
        return current;
      });
    });
    return () => {
      window.Echo.leave(`workspace.${workspaceId}.conversations`);
    };
  }, [activeWorkspace == null ? void 0 : activeWorkspace.id]);
  useEffect(() => {
    if (!typing) return;
    const timer = setInterval(() => {
      setTyping((current) => current && current.until <= Date.now() ? null : current);
    }, 1e3);
    return () => clearInterval(timer);
  }, [typing]);
  function handleSelectConv(conv) {
    setActiveConv(conv);
    activeConvRef.current = conv;
    unreadWhileHiddenRef.current = false;
    setReplyTo(null);
    window.history.replaceState(window.history.state, "", route("inbox.show", conv.id));
    setItems([]);
    setNextCursor(null);
    setLeadError(null);
    setLoadingMessages(true);
    setConvList((prev) => prev.map((c) => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    fetch(route("inbox.stream", conv.id), {
      headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" }
    }).then((r) => r.json()).then((responseData) => {
      setItems(responseData.items ?? []);
      setNextCursor(responseData.next_cursor ?? null);
      streamVersionRef.current = responseData.stream_version ?? null;
    }).catch(() => showToast("Không tải được tin nhắn. Vui lòng thử lại.")).finally(() => setLoadingMessages(false));
  }
  const loadingMoreRef = useRef(false);
  function handleLoadMore() {
    if (!activeConv || !nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    fetch(`${route("inbox.stream", activeConv.id)}?cursor=${encodeURIComponent(nextCursor)}`, {
      headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" }
    }).then((r) => r.json()).then((responseData) => {
      setItems((prev) => [...responseData.items ?? [], ...prev]);
      setNextCursor(responseData.next_cursor ?? null);
    }).catch(() => showToast("Không tải được tin cũ hơn. Vui lòng thử lại.")).finally(() => {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    });
  }
  function handleCreateLead() {
    var _a2;
    if (!activeConv) return;
    setLeadLoading(true);
    setLeadError(null);
    fetch(route("inbox.lead.store", activeConv.id), {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": decodeURIComponent(((_a2 = document.cookie.match(/XSRF-TOKEN=([^;]+)/)) == null ? void 0 : _a2[1]) ?? "")
      }
    }).then(async (r) => {
      const json = await r.json();
      if (!r.ok) {
        setLeadError(json.message ?? "Lỗi tạo Lead.");
        return;
      }
      setActiveConv((prev) => prev ? { ...prev, lead_id: json.lead_id } : prev);
      setConvList((prev) => prev.map((c) => c.id === activeConv.id ? { ...c, lead_id: json.lead_id } : c));
    }).catch(() => setLeadError("Không kết nối được server.")).finally(() => setLeadLoading(false));
  }
  function handleReact(msg, icon) {
    var _a2;
    if (!activeConv) return;
    fetch(route("inbox.reaction", [activeConv.id, msg.id]), {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": decodeURIComponent(((_a2 = document.cookie.match(/XSRF-TOKEN=([^;]+)/)) == null ? void 0 : _a2[1]) ?? "")
      },
      body: JSON.stringify({ icon })
    }).then(async (r) => {
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast(json.message ?? "Không thả được cảm xúc.");
        return;
      }
      setItems(
        (prev) => prev.map(
          (item) => isStreamMessage(item) && item.id === msg.id ? { ...item, reactions: json.reactions ?? item.reactions } : item
        )
      );
    }).catch(() => showToast("Không kết nối được server."));
  }
  function handlePendingMessage(temp) {
    setItems((prev) => [...prev, { ...temp, item_type: "message" }]);
    setConvList((prev) => {
      const updated = prev.map(
        (c) => c.id === temp.conversation_id ? { ...c, last_message_at: temp.created_at, last_message_preview: messagePreview(temp) } : c
      );
      return [...updated].sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));
    });
  }
  function handleMessageSent(real) {
    setItems((prev) => prev.some((it) => it.id === real.id) ? prev : [...prev, { ...real, item_type: "message" }]);
    setConvList((prev) => {
      const updated = prev.map(
        (c) => c.id === real.conversation_id ? { ...c, last_message_at: real.platform_sent_at ?? real.created_at, last_message_preview: messagePreview(real) } : c
      );
      return [...updated].sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));
    });
  }
  function handleSendSettled(tempId, real) {
    setItems((prev) => {
      var _a2;
      const temp = prev.find((it) => it.id === tempId);
      if (temp && isStreamMessage(temp) && ((_a2 = temp.media_url) == null ? void 0 : _a2.startsWith("blob:"))) URL.revokeObjectURL(temp.media_url);
      if (!real) return prev.filter((it) => it.id !== tempId);
      const alreadyAppended = prev.some((it) => it.id === real.id);
      return prev.flatMap((it) => it.id === tempId ? alreadyAppended ? [] : [{ ...real, item_type: "message" }] : [it]);
    });
  }
  function handleReply(msg) {
    setReplyTo({
      id: msg.id,
      text: msg.body ?? `[${msg.type}]`,
      senderName: msg.direction === "in" ? msg.sender_name ?? (activeConv == null ? void 0 : activeConv.peer_name) ?? "Khách" : "Bạn"
    });
  }
  function handleVerifyPhone() {
    var _a2;
    if (!activeConv || !phoneInput.trim() || phoneSaving) return;
    setPhoneSaving(true);
    setPhoneError(null);
    fetch(route("inbox.phone.update", activeConv.id), {
      method: "PUT",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": decodeURIComponent(((_a2 = document.cookie.match(/XSRF-TOKEN=([^;]+)/)) == null ? void 0 : _a2[1]) ?? "")
      },
      body: JSON.stringify({ phone: phoneInput.trim() })
    }).then(async (r) => {
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        setPhoneError(json.message ?? "Không xác minh được SĐT.");
        return;
      }
      setPhoneInput("");
      setActiveConv((prev) => prev ? { ...prev, peer_phone: json.peer_phone, contact_id: json.contact_id ?? prev.contact_id } : prev);
      setConvList((prev) => prev.map((c) => c.id === activeConv.id ? { ...c, peer_phone: json.peer_phone } : c));
    }).catch(() => setPhoneError("Không kết nối được server.")).finally(() => setPhoneSaving(false));
  }
  function handleSearch(e) {
    e.preventDefault();
    router.get(route("inbox.index"), { ...filters, q: search }, { preserveState: true, replace: true });
  }
  function handleSelectAccount(accountId) {
    router.get(route("inbox.index"), { ...filters, channel_account_id: accountId ?? void 0 }, { preserveState: true, replace: true });
  }
  const breadcrumbs2 = [{ title: "Inbox", href: route("inbox.index") }];
  const caps = activeConv && channelCapabilities[activeConv.channel] || {};
  const convQuotaRemaining = activeConv ? (entitlements == null ? void 0 : entitlements.remaining[`quota.conversations.${activeConv.channel}`]) ?? null : null;
  const convQuotaExhausted = convQuotaRemaining !== null && convQuotaRemaining <= 0;
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: "Inbox" }),
    /* @__PURE__ */ jsx(ConnectionBanner, { accounts: channelAccounts }),
    /* @__PURE__ */ jsxs("div", { className: "flex h-[calc(100vh-64px)] overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex w-80 flex-shrink-0 flex-col border-r", children: [
        /* @__PURE__ */ jsx(
          AccountRail,
          {
            accounts: channelAccounts,
            totalCount: conversations.total,
            activeAccountId: filters.channel_account_id ?? null,
            onSelect: handleSelectAccount
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2 border-b p-3", children: [
          /* @__PURE__ */ jsxs("form", { onSubmit: handleSearch, className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                placeholder: "Tìm hội thoại...",
                value: search,
                onChange: (e) => setSearch(e.target.value),
                className: "h-8 text-sm"
              }
            ),
            /* @__PURE__ */ jsx(Button, { type: "submit", size: "sm", variant: "secondary", children: "Tìm" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex gap-1", children: [
            ["", "Tất cả"],
            ["1", "Chưa đọc"]
          ].map(([value, label]) => /* @__PURE__ */ jsx(
            Button,
            {
              type: "button",
              size: "sm",
              variant: (filters.unread ?? "") === value ? "default" : "outline",
              className: "h-6 flex-1 text-[11px]",
              onClick: () => router.get(
                route("inbox.index"),
                { ...filters, unread: value || void 0 },
                { preserveState: true, replace: true }
              ),
              children: label
            },
            value
          )) }),
          /* @__PURE__ */ jsxs(Button, { type: "button", size: "sm", variant: "outline", className: "w-full", disabled: syncing, onClick: handleResync, children: [
            /* @__PURE__ */ jsx(RefreshCw, { className: `mr-1 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}` }),
            syncing ? "Đang đồng bộ..." : "Đồng bộ tin nhắn"
          ] }),
          canManageZalo && /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              className: "text-muted-foreground hover:text-foreground flex w-full items-center justify-between text-[11px]",
              disabled: seenSyncSaving,
              onClick: toggleSeenSync,
              title: "Bật = khách thấy shop đã xem tin (áp lực trả lời). Cân nhắc trước khi bật.",
              children: [
                /* @__PURE__ */ jsx("span", { children: 'Báo "đã xem" cho khách' }),
                /* @__PURE__ */ jsx(Badge, { variant: seenSync ? "default" : "outline", className: "text-[10px]", children: seenSync ? "BẬT" : "TẮT" })
              ]
            }
          ),
          zaloLimit !== null && zaloRemaining !== null && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Hội thoại tháng này" }),
            /* @__PURE__ */ jsxs(Badge, { variant: quotaExhausted ? "destructive" : "secondary", className: "text-[10px]", children: [
              zaloLimit - zaloRemaining,
              "/",
              zaloLimit
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto", children: [
          convList.length === 0 && /* @__PURE__ */ jsxs("div", { className: "text-muted-foreground p-6 text-center text-sm", children: [
            /* @__PURE__ */ jsx(MessageCircle, { className: "mx-auto mb-2 h-8 w-8 opacity-30" }),
            "Chưa có hội thoại nào."
          ] }),
          convList.map((conv) => {
            var _a2;
            return /* @__PURE__ */ jsx(
              "button",
              {
                className: `hover:bg-muted/50 w-full border-b px-4 py-3 text-left transition-colors ${(activeConv == null ? void 0 : activeConv.id) === conv.id ? "bg-muted" : ""}`,
                onClick: () => handleSelectConv(conv),
                children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                  /* @__PURE__ */ jsx(ChatAvatar, { name: conv.peer_name ?? conv.peer_uid, src: conv.peer_avatar_url, className: "h-9 w-9 shrink-0" }),
                  /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
                      /* @__PURE__ */ jsx("span", { className: "truncate text-sm font-medium", children: conv.peer_name ?? conv.peer_phone ?? conv.peer_uid }),
                      conv.unread_count > 0 && /* @__PURE__ */ jsx(Badge, { variant: "default", className: "h-4 min-w-4 shrink-0 px-1 text-[10px]", children: conv.unread_count })
                    ] }),
                    (typing == null ? void 0 : typing.convId) === conv.id ? /* @__PURE__ */ jsx("p", { className: "text-primary mt-0.5 truncate text-xs italic", children: "đang nhập…" }) : conv.last_message_preview && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-0.5 truncate text-xs", children: conv.last_message_preview }),
                    ((_a2 = conv.channel_account) == null ? void 0 : _a2.display_name) && /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground/70 mt-0.5 truncate text-[11px]", children: [
                      "↳ nhận qua: ",
                      conv.channel_account.display_name
                    ] })
                  ] })
                ] })
              },
              conv.id
            );
          })
        ] }),
        conversations.last_page > 1 && /* @__PURE__ */ jsxs("div", { className: "flex justify-center gap-2 border-t p-2", children: [
          conversations.prev_page_url && /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: () => router.get(conversations.prev_page_url), children: "←" }),
          /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground flex items-center text-xs", children: [
            conversations.current_page,
            "/",
            conversations.last_page
          ] }),
          conversations.next_page_url && /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: () => router.get(conversations.next_page_url), children: "→" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex flex-1 flex-col", children: !activeConv ? /* @__PURE__ */ jsx("div", { className: "text-muted-foreground flex flex-1 items-center justify-center", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
        /* @__PURE__ */ jsx(MessageCircle, { className: "mx-auto mb-3 h-12 w-12 opacity-20" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm", children: "Chọn một hội thoại để bắt đầu" })
      ] }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 border-b px-4 py-2", children: [
          /* @__PURE__ */ jsx(ChatAvatar, { name: activeConv.peer_name ?? activeConv.peer_uid, src: activeConv.peer_avatar_url }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsx("div", { className: "truncate text-sm font-medium", children: activeConv.peer_name ?? activeConv.peer_phone ?? activeConv.peer_uid }),
            activeConv.peer_phone && /* @__PURE__ */ jsx("div", { className: "text-muted-foreground text-xs", children: activeConv.peer_phone })
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          ChatThread,
          {
            items,
            peer: activeConv,
            loading: loadingMessages,
            hasMore: nextCursor !== null,
            loadingMore,
            onLoadMore: handleLoadMore,
            onReply: caps.canQuoteReply ? handleReply : void 0,
            onReact: caps.canReact ? handleReact : void 0
          }
        ),
        (typing == null ? void 0 : typing.convId) === activeConv.id && /* @__PURE__ */ jsx("div", { className: "text-muted-foreground px-4 pb-1 text-xs italic", children: "đang nhập…" }),
        convQuotaExhausted && items.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "border-t p-3 text-center", children: [
          /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground mb-2 text-xs", children: [
            "Đã đạt giới hạn hội thoại tháng này (",
            zaloLimit,
            " hội thoại)."
          ] }),
          /* @__PURE__ */ jsx(Button, { size: "sm", variant: "default", onClick: () => router.visit("/admin/billing/upgrade"), children: "Nâng gói" })
        ] }) : (
          // key theo conversation — reset text/đính kèm khi đổi hội thoại
          /* @__PURE__ */ jsx(
            MessageComposer,
            {
              conversationId: activeConv.id,
              onSent: handleMessageSent,
              onPending: handlePendingMessage,
              onSettled: handleSendSettled,
              replyTo,
              onClearReply: () => setReplyTo(null),
              peerName: activeConv.peer_name,
              canSendMedia: caps.canSendMedia === true,
              canSendSticker: caps.canSendSticker === true
            },
            activeConv.id
          )
        )
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "w-64 flex-shrink-0 border-l", children: activeConv ? /* @__PURE__ */ jsxs("div", { className: "space-y-4 p-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
          /* @__PURE__ */ jsx(
            ChatAvatar,
            {
              name: activeConv.peer_name ?? activeConv.peer_uid,
              src: activeConv.peer_avatar_url,
              className: "mx-auto mb-2 h-12 w-12"
            }
          ),
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: activeConv.peer_name ?? "Không rõ tên" }),
          activeConv.peer_phone && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: activeConv.peer_phone })
        ] }),
        activeConv.thread_type !== 1 && !activeConv.peer_phone && /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex gap-1", children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                value: phoneInput,
                onChange: (e) => setPhoneInput(e.target.value),
                placeholder: "SĐT khách...",
                className: "h-7 text-xs",
                disabled: phoneSaving
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                size: "sm",
                variant: "secondary",
                className: "h-7 text-xs",
                disabled: phoneSaving || !phoneInput.trim(),
                onClick: handleVerifyPhone,
                children: phoneSaving ? "..." : "Xác minh"
              }
            )
          ] }),
          phoneError && /* @__PURE__ */ jsx("p", { className: "text-destructive text-[11px]", children: phoneError })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1 text-xs", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Kênh" }),
            /* @__PURE__ */ jsx("span", { className: "font-medium", children: activeConv.channel })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Liên hệ" }),
            /* @__PURE__ */ jsx("span", { children: activeConv.contact_id ? "Đã lưu" : "Nháp" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Lead" }),
            /* @__PURE__ */ jsx("span", { children: activeConv.lead_id ? `#${activeConv.lead_id.slice(0, 8)}` : "Chưa có" })
          ] })
        ] }),
        activeConv.lead_id ? /* @__PURE__ */ jsxs(
          Button,
          {
            size: "sm",
            variant: "outline",
            className: "w-full",
            onClick: () => router.visit(route("leads.show", activeConv.lead_id)),
            children: [
              "Xem Lead #",
              activeConv.lead_id.slice(0, 8)
            ]
          }
        ) : /* @__PURE__ */ jsxs(Fragment, { children: [
          activeConv.thread_type !== 1 ? /* @__PURE__ */ jsx(Button, { size: "sm", className: "w-full", disabled: leadLoading, onClick: handleCreateLead, children: leadLoading ? "Đang tạo..." : "Tạo Lead" }) : /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-center text-xs", children: "Hội thoại nhóm — không tạo Lead" }),
          leadError && /* @__PURE__ */ jsx("p", { className: "text-destructive text-xs", children: leadError })
        ] }),
        /* @__PURE__ */ jsx(ConversationPanel, { conversationId: activeConv.id }, activeConv.id)
      ] }) : /* @__PURE__ */ jsx("div", { className: "text-muted-foreground p-4 text-center text-sm", children: "Chọn hội thoại để xem thông tin" }) })
    ] })
  ] });
}
const __vite_glob_0_37 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: InboxIndex
}, Symbol.toStringTag, { value: "Module" }));
const CATEGORY_ICONS = {
  // ponytail: only 'chat' exists now; add entries as new categories arrive
  chat: /* @__PURE__ */ jsx(MessageSquare, { className: "h-6 w-6" })
};
const ZALO_HREF = {
  zalo_personal: "/integrations/zalo"
};
function IntegrationCardItem({ card }) {
  const t = useTranslator();
  const href = ZALO_HREF[card.key] ?? `/integrations/${card.key}`;
  return /* @__PURE__ */ jsxs(Card, { className: !card.enabled ? "opacity-60" : "", children: [
    /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-row items-center gap-3 pb-2", children: [
      card.logo ? /* @__PURE__ */ jsx("img", { src: card.logo, alt: card.name, className: "h-6 w-6 shrink-0 rounded object-contain" }) : /* @__PURE__ */ jsx("div", { className: "text-muted-foreground", children: CATEGORY_ICONS[card.category] ?? /* @__PURE__ */ jsx(MessageSquare, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: card.name }),
      /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "ml-auto text-xs capitalize", children: t(`platform.integrations.category.${card.category}`) })
    ] }),
    /* @__PURE__ */ jsx(CardContent, { className: "pb-2", children: card.connected ? /* @__PURE__ */ jsx(Badge, { variant: "default", className: "text-xs", children: t("platform.integrations.connected") }) : /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs", children: t("platform.integrations.not_connected") }) }),
    /* @__PURE__ */ jsx(CardFooter, { children: card.enabled ? /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", variant: card.connected ? "outline" : "default", children: /* @__PURE__ */ jsx(Link, { href, children: card.connected ? t("platform.integrations.manage") : t("platform.integrations.connect") }) }) : /* @__PURE__ */ jsx(Button, { size: "sm", disabled: true, children: t("platform.integrations.connect") }) })
  ] });
}
const __vite_glob_0_38 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  IntegrationCardItem
}, Symbol.toStringTag, { value: "Module" }));
function IntegrationsIndex({ cards: cards2 }) {
  const t = useTranslator();
  const breadcrumbs2 = [{ title: t("platform.nav.integrations"), href: "/integrations" }];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("platform.nav.integrations") }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-4 md:p-6", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-xl font-semibold", children: t("platform.integrations.title") }),
        /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: t("platform.integrations.subtitle") })
      ] }),
      cards2.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: t("platform.integrations.empty") }) : /* @__PURE__ */ jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: cards2.map((card) => /* @__PURE__ */ jsx(IntegrationCardItem, { card }, card.key)) })
    ] })
  ] });
}
const __vite_glob_0_39 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: IntegrationsIndex
}, Symbol.toStringTag, { value: "Module" }));
const STATE_LABELS = {
  connected: "Đã kết nối",
  qr_waiting: "Đang chờ QR",
  disconnected: "Chưa kết nối",
  session_lost: "Mất phiên"
};
const STATE_VARIANTS = {
  connected: "default",
  qr_waiting: "secondary",
  disconnected: "outline",
  session_lost: "destructive"
};
const INITIAL_QR = {
  open: false,
  connectionId: null,
  qrToken: null,
  phase: "idle",
  qrImage: null,
  error: null,
  expectedAccountUid: null
};
function ZaloConnectionsIndex({ connections }) {
  const breadcrumbs2 = [
    { title: "Tích hợp", href: "/integrations" },
    { title: "Kết nối Zalo", href: "/integrations/zalo" }
  ];
  const [qrState, setQrState] = useState(INITIAL_QR);
  const pollRef = useRef(null);
  useEffect(() => {
    if (!qrState.open || !qrState.qrToken) return;
    if (qrState.phase === "ready" || qrState.phase === "error") return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/integrations/zalo/qr-status?qr_token=${qrState.qrToken}`, {
          headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" }
        });
        const data = await res.json();
        setQrState((prev) => ({
          ...prev,
          phase: data.phase ?? prev.phase,
          qrImage: data.qr_image ?? prev.qrImage,
          error: data.error ?? prev.error
        }));
        if (data.phase === "ready") {
          clearPoll();
          await promoteConnection(qrState.connectionId, qrState.qrToken, qrState.expectedAccountUid);
        }
      } catch {
      }
    }, 2e3);
    return () => clearPoll();
  }, [qrState.open, qrState.qrToken, qrState.phase]);
  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  const startQrLogin = async (expectedAccountUid = null) => {
    setQrState({ ...INITIAL_QR, open: true, phase: "starting", expectedAccountUid });
    try {
      const res = await fetch("/integrations/zalo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": getCsrfToken()
        }
      });
      const data = await res.json();
      if (!data.ok) {
        setQrState((prev) => ({ ...prev, phase: "error", error: data.message ?? "Lỗi không xác định" }));
        return;
      }
      setQrState((prev) => ({
        ...prev,
        connectionId: data.connection_id,
        qrToken: data.qr_token,
        phase: "logging_in"
      }));
    } catch (e) {
      setQrState((prev) => ({ ...prev, phase: "error", error: String(e) }));
    }
  };
  const promoteConnection = async (connectionId, qrToken, expectedAccountUid) => {
    try {
      const res = await fetch("/integrations/zalo/promote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": getCsrfToken()
        },
        body: JSON.stringify({ connection_id: connectionId, qr_token: qrToken, expected_account_uid: expectedAccountUid })
      });
      const data = await res.json();
      if (data.ok) {
        setQrState((prev) => ({ ...prev, phase: "done" }));
        router.reload({ only: ["connections"] });
      } else if (data.error_code === "zalo_account_mismatch") {
        setQrState((prev) => ({
          ...prev,
          phase: "error",
          error: "Đã quét nhầm tài khoản Zalo khác — vui lòng quét đúng tài khoản cần đăng nhập lại."
        }));
      } else {
        setQrState((prev) => ({ ...prev, phase: "error", error: data.message ?? "promote_failed" }));
      }
    } catch (e) {
      setQrState((prev) => ({ ...prev, phase: "error", error: String(e) }));
    }
  };
  const disconnectConnection = async (id) => {
    if (!confirm("Xác nhận ngắt kết nối Zalo này?")) return;
    try {
      const res = await fetch(`/integrations/zalo/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": getCsrfToken()
        }
      });
      if (!res.ok) {
        alert("Ngắt kết nối thất bại. Vui lòng thử lại.");
        return;
      }
      router.reload({ only: ["connections"] });
    } catch {
      alert("Không kết nối được server.");
    }
  };
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: "Kết nối Zalo" }),
    /* @__PURE__ */ jsx("div", { className: "flex flex-1 flex-col gap-6 p-4 md:p-6", children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold", children: "Kết nối Zalo cá nhân" }),
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: "Quản lý tài khoản Zalo cá nhân kết nối vào workspace." })
        ] }),
        /* @__PURE__ */ jsx(Button, { onClick: () => startQrLogin(), disabled: qrState.open && qrState.phase !== "done" && qrState.phase !== "error", children: "+ Thêm tài khoản Zalo" })
      ] }),
      qrState.open && /* @__PURE__ */ jsxs("div", { className: "space-y-4 rounded-lg border p-6", children: [
        /* @__PURE__ */ jsx("h3", { className: "font-medium", children: "Đăng nhập bằng mã QR" }),
        qrState.phase === "starting" && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: "Đang khởi động..." }),
        (qrState.phase === "logging_in" || qrState.phase === "qr_waiting") && !qrState.qrImage && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: "Đang tạo mã QR..." }),
        qrState.qrImage && /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm", children: "Mở Zalo trên điện thoại và quét mã QR bên dưới:" }),
          /* @__PURE__ */ jsx("img", { src: qrState.qrImage, alt: "Zalo QR Code", className: "h-48 w-48 rounded border" })
        ] }),
        qrState.phase === "ready" && /* @__PURE__ */ jsx("p", { className: "text-sm text-green-600", children: "Đăng nhập thành công! Đang kết nối..." }),
        qrState.phase === "done" && /* @__PURE__ */ jsx("p", { className: "text-sm text-green-600", children: "Kết nối hoàn tất." }),
        qrState.phase === "error" && /* @__PURE__ */ jsxs("p", { className: "text-sm text-red-600", children: [
          "Lỗi: ",
          qrState.error
        ] }),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: () => {
              clearPoll();
              setQrState(INITIAL_QR);
            },
            children: "Đóng"
          }
        )
      ] }),
      connections.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: 'Chưa có tài khoản Zalo nào. Nhấn "Thêm tài khoản Zalo" để bắt đầu.' }) : /* @__PURE__ */ jsx("div", { className: "divide-y rounded-lg border", children: connections.map((conn) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-4 py-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          conn.avatar_url && /* @__PURE__ */ jsx("img", { src: conn.avatar_url, alt: "", className: "h-8 w-8 rounded-full object-cover" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: conn.display_name ?? conn.personal_uid ?? `#${conn.connection_id}` }),
            conn.session_lost_reason && /* @__PURE__ */ jsx("p", { className: "text-xs text-red-500", children: conn.session_lost_reason })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx(Badge, { variant: STATE_VARIANTS[conn.state], children: STATE_LABELS[conn.state] }),
          conn.state === "session_lost" && /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: () => startQrLogin(conn.personal_uid), children: "Đăng nhập lại" }),
          /* @__PURE__ */ jsx(Button, { size: "sm", variant: "destructive", onClick: () => disconnectConnection(conn.id), children: "Ngắt kết nối" })
        ] })
      ] }, conn.id)) })
    ] }) })
  ] });
}
function getCsrfToken() {
  return (document.cookie.match(/XSRF-TOKEN=([^;]+)/) ?? [])[1] ? decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) ?? [])[1]) : "";
}
const __vite_glob_0_40 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ZaloConnectionsIndex
}, Symbol.toStringTag, { value: "Module" }));
function NotificationsIndex({ notifications, unread_count }) {
  const t = useTranslator();
  const breadcrumbs2 = [{ title: t("notification.page.title"), href: route("notifications.index") }];
  function handleMarkAll() {
    router.post(route("notifications.read-all"), {}, { preserveScroll: true });
  }
  function handleMarkRead(id) {
    router.post(route("notifications.read", { id }), {}, { preserveScroll: true });
  }
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("notification.page.title") }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-4 md:p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
        /* @__PURE__ */ jsx(PageHeader, { title: t("notification.page.title"), description: t("notification.page.subtitle") }),
        unread_count > 0 && /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "gap-2", onClick: handleMarkAll, children: [
          /* @__PURE__ */ jsx(CheckCheck, { className: "h-4 w-4" }),
          t("notification.page.mark_all_read")
        ] })
      ] }),
      notifications.data.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground py-12 text-center text-sm", children: t("notification.page.empty") }) : /* @__PURE__ */ jsx("div", { className: "divide-border divide-y rounded-lg border", children: notifications.data.map((n) => /* @__PURE__ */ jsxs("div", { className: `flex items-start gap-4 px-4 py-4 ${!n.read_at ? "bg-muted/30" : ""}`, children: [
        !n.read_at && /* @__PURE__ */ jsx("span", { className: "bg-primary mt-2 h-2 w-2 shrink-0 rounded-full" }),
        n.read_at && /* @__PURE__ */ jsx("span", { className: "mt-2 h-2 w-2 shrink-0" }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm", children: t(`notification.actions.${n.action ?? ""}`) ?? n.action }),
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-0.5 text-xs", children: formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex shrink-0 items-center gap-2", children: n.read_at ? /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "text-xs", children: t("notification.page.filter_unread") ? "" : "Read" }) : /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", className: "h-7 text-xs", onClick: () => handleMarkRead(n.id), children: t("notification.panel.mark_read") }) })
      ] }, n.id)) }),
      notifications.last_page > 1 && /* @__PURE__ */ jsxs("div", { className: "flex justify-center gap-2", children: [
        notifications.prev_page_url && /* @__PURE__ */ jsx(Link, { href: notifications.prev_page_url, children: /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", children: "←" }) }),
        /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground flex items-center text-sm", children: [
          notifications.current_page,
          " / ",
          notifications.last_page
        ] }),
        notifications.next_page_url && /* @__PURE__ */ jsx(Link, { href: notifications.next_page_url, children: /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", children: "→" }) })
      ] })
    ] })
  ] });
}
const __vite_glob_0_41 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: NotificationsIndex
}, Symbol.toStringTag, { value: "Module" }));
const BILLING_TYPES = [
  { value: "3", labelKey: "projects.billing_types.non_billable" },
  { value: "1", labelKey: "projects.billing_types.fixed" },
  { value: "2", labelKey: "projects.billing_types.hourly" }
];
const NO_OWNER = "__none__";
function ProjectForm({ project, clients, statuses, members, fieldDefs, submitRoute, method = "post" }) {
  var _a;
  const t = useTranslator();
  const { data, setData, post, patch, processing, errors } = useForm({
    name: (project == null ? void 0 : project.name) ?? "",
    description: (project == null ? void 0 : project.description) ?? "",
    client_id: (project == null ? void 0 : project.client_id) ?? "",
    status_id: (project == null ? void 0 : project.status_id) ?? "",
    // owner?.id is number; stringify for Select (sentinel __none__ is string)
    owner_id: ((_a = project == null ? void 0 : project.owner) == null ? void 0 : _a.id) != null ? String(project.owner.id) : "",
    billing_type: String((project == null ? void 0 : project.billing_type) ?? 3),
    start_date: (project == null ? void 0 : project.start_date) ?? "",
    deadline: (project == null ? void 0 : project.deadline) ?? "",
    progress: (project == null ? void 0 : project.progress) ?? 0,
    progress_from_tasks: (project == null ? void 0 : project.progress_from_tasks) ?? false,
    visible_to_customer: (project == null ? void 0 : project.visible_to_customer) ?? false,
    custom_fields: (project == null ? void 0 : project.custom_fields) ?? {}
  });
  function handleSubmit(e) {
    e.preventDefault();
    if (method === "patch") {
      patch(submitRoute);
    } else {
      post(submitRoute);
    }
  }
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ jsx(Label, { htmlFor: "name", children: t("projects.fields.name") }),
      /* @__PURE__ */ jsx(Input, { id: "name", value: data.name, onChange: (e) => setData("name", e.target.value), required: true, maxLength: 191 }),
      errors.name && /* @__PURE__ */ jsx("p", { className: "text-destructive text-sm", children: errors.name })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ jsx(Label, { htmlFor: "client_id", children: t("projects.fields.client") }),
      /* @__PURE__ */ jsxs(Select, { value: data.client_id, onValueChange: (v) => setData("client_id", v), children: [
        /* @__PURE__ */ jsx(SelectTrigger, { id: "client_id", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "— select client —" }) }),
        /* @__PURE__ */ jsx(SelectContent, { children: clients.map((c) => /* @__PURE__ */ jsx(SelectItem, { value: c.id, children: c.name }, c.id)) })
      ] }),
      errors.client_id && /* @__PURE__ */ jsx("p", { className: "text-destructive text-sm", children: errors.client_id })
    ] }),
    statuses.length > 0 && /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ jsx(Label, { htmlFor: "status_id", children: t("projects.fields.status") ?? "Status" }),
      /* @__PURE__ */ jsxs(Select, { value: data.status_id || NO_OWNER, onValueChange: (v) => setData("status_id", v === NO_OWNER ? "" : v), children: [
        /* @__PURE__ */ jsx(SelectTrigger, { id: "status_id", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "— default —" }) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: NO_OWNER, children: t("projects.fields.status_default") ?? "— default —" }),
          statuses.map((s) => /* @__PURE__ */ jsx(SelectItem, { value: s.id, children: s.name }, s.id))
        ] })
      ] })
    ] }),
    members.length > 0 && /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ jsx(Label, { htmlFor: "owner_id", children: t("projects.fields.owner") ?? "Owner" }),
      /* @__PURE__ */ jsxs(Select, { value: data.owner_id || NO_OWNER, onValueChange: (v) => setData("owner_id", v === NO_OWNER ? "" : v), children: [
        /* @__PURE__ */ jsx(SelectTrigger, { id: "owner_id", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "— me (default) —" }) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: NO_OWNER, children: t("projects.fields.owner_default") ?? "— me (default) —" }),
          members.map((m) => /* @__PURE__ */ jsx(SelectItem, { value: String(m.id), children: m.name }, m.id))
        ] })
      ] }),
      errors.owner_id && /* @__PURE__ */ jsx("p", { className: "text-destructive text-sm", children: errors.owner_id })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ jsx(Label, { htmlFor: "billing_type", children: t("projects.fields.billing_type") }),
      /* @__PURE__ */ jsxs(Select, { value: data.billing_type, onValueChange: (v) => setData("billing_type", v), children: [
        /* @__PURE__ */ jsx(SelectTrigger, { id: "billing_type", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsx(SelectContent, { children: BILLING_TYPES.map((bt) => /* @__PURE__ */ jsx(SelectItem, { value: bt.value, children: t(bt.labelKey) }, bt.value)) })
      ] }),
      errors.billing_type && /* @__PURE__ */ jsx("p", { className: "text-destructive text-sm", children: errors.billing_type })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "start_date", children: t("projects.fields.start_date") }),
        /* @__PURE__ */ jsx(Input, { id: "start_date", type: "date", value: data.start_date, onChange: (e) => setData("start_date", e.target.value) }),
        errors.start_date && /* @__PURE__ */ jsx("p", { className: "text-destructive text-sm", children: errors.start_date })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "deadline", children: t("projects.fields.deadline") }),
        /* @__PURE__ */ jsx(Input, { id: "deadline", type: "date", value: data.deadline, onChange: (e) => setData("deadline", e.target.value) }),
        errors.deadline && /* @__PURE__ */ jsx("p", { className: "text-destructive text-sm", children: errors.deadline })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ jsx(Label, { htmlFor: "description", children: t("projects.fields.description") }),
      /* @__PURE__ */ jsx(Textarea, { id: "description", value: data.description, onChange: (e) => setData("description", e.target.value), rows: 4 }),
      errors.description && /* @__PURE__ */ jsx("p", { className: "text-destructive text-sm", children: errors.description })
    ] }),
    fieldDefs && fieldDefs.length > 0 && /* @__PURE__ */ jsx(
      CustomFieldsSection,
      {
        definitions: fieldDefs,
        values: data.custom_fields,
        errors,
        onChange: (slug, value) => setData("custom_fields", { ...data.custom_fields, [slug]: value })
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:gap-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Switch, { id: "progress_from_tasks", checked: data.progress_from_tasks, onCheckedChange: (v) => setData("progress_from_tasks", v) }),
        /* @__PURE__ */ jsx(Label, { htmlFor: "progress_from_tasks", children: t("projects.fields.progress_from_tasks") })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Switch, { id: "visible_to_customer", checked: data.visible_to_customer, onCheckedChange: (v) => setData("visible_to_customer", v) }),
        /* @__PURE__ */ jsx(Label, { htmlFor: "visible_to_customer", children: t("projects.fields.visible_to_customer") })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Button, { type: "submit", disabled: processing, children: method === "patch" ? t("projects.actions.edit") : t("projects.actions.create") })
  ] });
}
function ProjectCreate({ clients, statuses, members, fieldDefs }) {
  const t = useTranslator();
  const breadcrumbs2 = [
    { title: t("projects.title.index") ?? "Projects", href: route("projects.index") },
    { title: t("projects.title.create") ?? "Create Project", href: route("projects.create") }
  ];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("projects.title.create") ?? "Create Project" }),
    /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl p-4 md:p-6", children: [
      /* @__PURE__ */ jsx(PageHeader, { title: t("projects.title.create") ?? "Create Project", className: "mb-6" }),
      /* @__PURE__ */ jsx(
        ProjectForm,
        {
          clients,
          statuses,
          members,
          fieldDefs,
          submitRoute: route("projects.store"),
          method: "post"
        }
      )
    ] })
  ] });
}
const __vite_glob_0_42 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ProjectCreate
}, Symbol.toStringTag, { value: "Module" }));
function ProjectEdit({ project, clients, statuses, members, fieldDefs }) {
  const t = useTranslator();
  const breadcrumbs2 = [
    { title: t("projects.title.index") ?? "Projects", href: route("projects.index") },
    { title: project.name, href: route("projects.show", project.id) },
    { title: t("projects.title.edit") ?? "Edit", href: route("projects.edit", project.id) }
  ];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: `${t("projects.title.edit")} — ${project.name}` }),
    /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl p-4 md:p-6", children: [
      /* @__PURE__ */ jsx(PageHeader, { title: `${t("projects.title.edit")}: ${project.name}`, className: "mb-6" }),
      /* @__PURE__ */ jsx(
        ProjectForm,
        {
          project,
          clients,
          statuses,
          members,
          fieldDefs,
          submitRoute: route("projects.update", project.id),
          method: "patch"
        }
      )
    ] })
  ] });
}
const __vite_glob_0_43 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ProjectEdit
}, Symbol.toStringTag, { value: "Module" }));
function StatusBadge({ status }) {
  if (!status) return /* @__PURE__ */ jsx(Badge, { variant: "outline", children: "—" });
  return /* @__PURE__ */ jsx(Badge, { style: status.color ? { backgroundColor: status.color, color: "#fff", borderColor: status.color } : {}, variant: "outline", children: status.name });
}
function ProjectsIndex({ projects, statuses, filters, can }) {
  const t = useTranslator();
  const [search, setSearch] = useState(filters.search ?? "");
  const breadcrumbs2 = [{ title: t("projects.title.index") ?? "Projects", href: route("projects.index") }];
  const applyFilter = useCallback(
    (params) => {
      router.get(route("projects.index"), { ...filters, ...params }, { preserveState: true, replace: true });
    },
    [filters]
  );
  function handleSearch(e) {
    e.preventDefault();
    applyFilter({ search });
  }
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("projects.title.index") ?? "Projects" }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-4 md:p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
        /* @__PURE__ */ jsx(
          PageHeader,
          {
            title: t("projects.title.index") ?? "Projects",
            description: `${projects.total} ${(t("projects.title.index") ?? "projects").toLowerCase()}`
          }
        ),
        can.create && /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", children: /* @__PURE__ */ jsxs(Link, { href: route("projects.create"), children: [
          /* @__PURE__ */ jsx(Plus, { className: "mr-1 h-4 w-4" }),
          t("projects.actions.create")
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxs("form", { onSubmit: handleSearch, className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              placeholder: t("projects.actions.search") ?? "Search...",
              value: search,
              onChange: (e) => setSearch(e.target.value),
              className: "w-60"
            }
          ),
          /* @__PURE__ */ jsx(Button, { type: "submit", variant: "outline", size: "sm", children: t("projects.actions.search") })
        ] }),
        /* @__PURE__ */ jsxs(Select, { value: filters.status ?? "all", onValueChange: (v) => applyFilter({ status: v === "all" ? "" : v }), children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-44", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: t("projects.filters.all_statuses") }) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "all", children: t("projects.filters.all_statuses") }),
            statuses.map((s) => /* @__PURE__ */ jsx(SelectItem, { value: s.id, children: s.name }, s.id))
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "rounded-md border", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-muted/40 border-b", children: [
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left font-medium", children: "#" }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left font-medium", children: t("projects.fields.name") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left font-medium", children: t("projects.fields.client") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left font-medium", children: t("projects.fields.status") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left font-medium", children: t("projects.fields.progress") }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left font-medium", children: t("projects.fields.deadline") })
        ] }) }),
        /* @__PURE__ */ jsxs("tbody", { children: [
          projects.data.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 6, className: "text-muted-foreground px-4 py-8 text-center", children: "No projects found." }) }),
          projects.data.map((project) => {
            var _a;
            return /* @__PURE__ */ jsxs("tr", { className: "hover:bg-muted/20 border-b last:border-0", children: [
              /* @__PURE__ */ jsxs("td", { className: "text-muted-foreground px-4 py-3", children: [
                "#",
                project.project_number
              ] }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
                project.is_pinned && /* @__PURE__ */ jsx(Pin, { className: "h-3 w-3 text-amber-500" }),
                /* @__PURE__ */ jsx(Link, { href: route("projects.show", project.id), className: "font-medium hover:underline", children: project.name })
              ] }) }),
              /* @__PURE__ */ jsx("td", { className: "text-muted-foreground px-4 py-3", children: ((_a = project.client) == null ? void 0 : _a.name) ?? "—" }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx(StatusBadge, { status: project.status }) }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx("div", { className: "bg-muted h-1.5 w-24 overflow-hidden rounded-full", children: /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: "bg-primary h-full rounded-full transition-all",
                    style: { width: `${project.progress}%` }
                  }
                ) }),
                /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground text-xs", children: [
                  project.progress,
                  "%"
                ] })
              ] }) }),
              /* @__PURE__ */ jsx("td", { className: "text-muted-foreground px-4 py-3", children: project.deadline ? new Date(project.deadline).toLocaleDateString() : "—" })
            ] }, project.id);
          })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "text-muted-foreground flex justify-between text-sm", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          "Total: ",
          projects.total
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          projects.prev_page_url && /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: () => router.get(projects.prev_page_url), children: "Previous" }),
          projects.next_page_url && /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: () => router.get(projects.next_page_url), children: "Next" })
        ] })
      ] })
    ] })
  ] });
}
const __vite_glob_0_44 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ProjectsIndex
}, Symbol.toStringTag, { value: "Module" }));
function ActivityFeed({ activities }) {
  const t = useTranslator();
  if (activities.length === 0) {
    return /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: "No activity yet." });
  }
  return /* @__PURE__ */ jsx("ol", { className: "space-y-3", children: activities.map((item) => /* @__PURE__ */ jsxs("li", { className: "flex gap-3 text-sm", children: [
    /* @__PURE__ */ jsx("span", { className: "bg-primary/60 ring-background mt-0.5 h-2 w-2 shrink-0 rounded-full ring-2" }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { className: "font-medium", children: t("projects.activity." + item.action) ?? item.action }),
      /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground text-xs", children: [
        item.actor_name ?? "—",
        " · ",
        new Date(item.occurred_at).toLocaleString()
      ] })
    ] })
  ] }, item.id)) });
}
function DiscussionThread({ project, canComment }) {
  const t = useTranslator();
  const discussions = project.discussions ?? [];
  const [showForm, setShowForm] = useState(false);
  const { data, setData, post, processing, reset } = useForm({
    subject: "",
    body: "",
    show_to_customer: false
  });
  function handleCreate(e) {
    e.preventDefault();
    post(route("projects.discussions.store", project.id), {
      preserveScroll: true,
      onSuccess: () => {
        reset();
        setShowForm(false);
      }
    });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    canComment && !showForm && /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => setShowForm(true), children: [
      /* @__PURE__ */ jsx(Plus, { className: "mr-1 h-4 w-4" }),
      t("projects.actions.new_discussion")
    ] }),
    showForm && /* @__PURE__ */ jsxs("form", { onSubmit: handleCreate, className: "max-w-lg space-y-3 rounded-lg border p-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "disc-subject", children: t("projects.discussion.subject") }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "disc-subject",
            className: "border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm",
            value: data.subject,
            onChange: (e) => setData("subject", e.target.value),
            required: true,
            maxLength: 191
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "disc-body", children: t("projects.discussion.body") }),
        /* @__PURE__ */ jsx(Textarea, { id: "disc-body", value: data.body, onChange: (e) => setData("body", e.target.value), rows: 3 })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Switch, { id: "disc-show", checked: data.show_to_customer, onCheckedChange: (v) => setData("show_to_customer", v) }),
        /* @__PURE__ */ jsx(Label, { htmlFor: "disc-show", children: t("projects.discussion.show_to_customer") })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(Button, { type: "submit", size: "sm", disabled: processing, children: t("projects.actions.new_discussion") }),
        /* @__PURE__ */ jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => setShowForm(false), children: "Cancel" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
      discussions.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: "No discussions yet." }),
      discussions.map((d) => /* @__PURE__ */ jsx(DiscussionCard, { discussion: d, project, canComment }, d.id))
    ] })
  ] });
}
function DiscussionCard({ discussion, project, canComment }) {
  var _a;
  const t = useTranslator();
  const [showReply, setShowReply] = useState(false);
  const { data, setData, post, processing, reset } = useForm({ body: "", parent_id: null });
  function handleReply(e) {
    e.preventDefault();
    post(route("projects.discussions.reply", { project: project.id, discussion: discussion.id }), {
      preserveScroll: true,
      onSuccess: () => {
        reset();
        setShowReply(false);
      }
    });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-2 rounded-lg border p-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "font-medium", children: discussion.subject }),
        /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground text-xs", children: [
          ((_a = discussion.author) == null ? void 0 : _a.name) ?? "—",
          " · ",
          new Date(discussion.created_at).toLocaleDateString()
        ] })
      ] }),
      discussion.show_to_customer && /* @__PURE__ */ jsx("span", { className: "rounded bg-green-50 px-2 py-0.5 text-xs text-green-700", children: t("projects.discussion.show_to_customer") })
    ] }),
    discussion.body && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm whitespace-pre-line", children: discussion.body }),
    (discussion.comments ?? []).length > 0 && /* @__PURE__ */ jsx("div", { className: "ml-4 space-y-2 border-l pl-4", children: discussion.comments.map((reply) => {
      var _a2;
      return /* @__PURE__ */ jsxs("div", { className: "text-sm", children: [
        /* @__PURE__ */ jsx("span", { className: "font-medium", children: ((_a2 = reply.user) == null ? void 0 : _a2.name) ?? "—" }),
        /* @__PURE__ */ jsx("span", { className: "text-muted-foreground mx-1", children: "·" }),
        /* @__PURE__ */ jsx("span", { className: "whitespace-pre-line", children: reply.body })
      ] }, reply.id);
    }) }),
    canComment && /* @__PURE__ */ jsx("div", { children: !showReply ? /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "ghost", onClick: () => setShowReply(true), children: [
      /* @__PURE__ */ jsx(MessageSquare, { className: "mr-1 h-3.5 w-3.5" }),
      t("projects.actions.reply")
    ] }) : /* @__PURE__ */ jsxs("form", { onSubmit: handleReply, className: "mt-2 space-y-2", children: [
      /* @__PURE__ */ jsx(
        Textarea,
        {
          value: data.body,
          onChange: (e) => setData("body", e.target.value),
          rows: 2,
          placeholder: "Write a reply...",
          required: true
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(Button, { type: "submit", size: "sm", disabled: processing, children: t("projects.actions.reply") }),
        /* @__PURE__ */ jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => setShowReply(false), children: "Cancel" })
      ] })
    ] }) })
  ] });
}
function FileList({ project, canManage }) {
  const t = useTranslator();
  const attachments = project.attachments ?? [];
  const inputRef = useRef(null);
  function handleUpload(e) {
    var _a;
    const file = (_a = e.target.files) == null ? void 0 : _a[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    router.post(route("projects.files.store", project.id), formData, {
      preserveScroll: true,
      forceFormData: true
    });
    e.target.value = "";
  }
  function handleDelete(attachmentId) {
    router.delete(route("projects.files.destroy", { project: project.id, attachment: attachmentId }), {
      preserveScroll: true
    });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    canManage && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("input", { ref: inputRef, type: "file", className: "hidden", onChange: handleUpload }),
      /* @__PURE__ */ jsx(Button, { size: "sm", onClick: () => {
        var _a;
        return (_a = inputRef.current) == null ? void 0 : _a.click();
      }, children: t("projects.actions.upload_file") })
    ] }),
    attachments.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: "No files uploaded yet." }),
    /* @__PURE__ */ jsx("ul", { className: "divide-y rounded-md border", children: attachments.map((att) => /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-3 px-4 py-3", children: [
      /* @__PURE__ */ jsx(FileText, { className: "text-muted-foreground h-4 w-4 shrink-0" }),
      /* @__PURE__ */ jsx("span", { className: "flex-1 truncate text-sm", children: att.file_name ?? att.path }),
      att.visible_to_customer && /* @__PURE__ */ jsx("span", { className: "rounded bg-green-50 px-2 py-0.5 text-xs text-green-700", children: "Customer" }),
      /* @__PURE__ */ jsx("a", { href: route("attachments.download", att.attachment_key), className: "text-muted-foreground hover:text-foreground", download: true, children: /* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }) }),
      canManage && /* @__PURE__ */ jsx("button", { onClick: () => handleDelete(att.id), className: "text-destructive opacity-50 hover:opacity-100", children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) })
    ] }, att.id)) })
  ] });
}
function MemberList({ project, workspaceMembers, canManage }) {
  const t = useTranslator();
  const members = project.members ?? [];
  const [selectedUserId, setSelectedUserId] = useState("");
  const { post, processing } = useForm({ user_id: "" });
  function handleAdd() {
    if (!selectedUserId) return;
    router.post(route("projects.members.store", project.id), { user_id: parseInt(selectedUserId, 10) }, { preserveScroll: true });
    setSelectedUserId("");
  }
  function handleRemove(userId) {
    router.delete(route("projects.members.destroy", { project: project.id, userId }), { preserveScroll: true });
  }
  const nonMembers = workspaceMembers.filter((wm) => !members.some((m) => m.id === wm.id));
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    canManage && /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsxs(
        "select",
        {
          className: "border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm",
          value: selectedUserId,
          onChange: (e) => setSelectedUserId(e.target.value),
          children: [
            /* @__PURE__ */ jsxs("option", { value: "", children: [
              "— ",
              t("projects.actions.add_member"),
              " —"
            ] }),
            nonMembers.map((u) => /* @__PURE__ */ jsx("option", { value: u.id, children: u.name }, u.id))
          ]
        }
      ),
      /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: handleAdd, disabled: processing || !selectedUserId, children: [
        /* @__PURE__ */ jsx(UserPlus, { className: "mr-1 h-4 w-4" }),
        t("projects.actions.add_member")
      ] })
    ] }),
    /* @__PURE__ */ jsxs("ul", { className: "divide-y rounded-md border", children: [
      members.length === 0 && /* @__PURE__ */ jsxs("li", { className: "text-muted-foreground px-4 py-3 text-sm", children: [
        t("projects.member.user"),
        " —"
      ] }),
      members.map((member) => /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between px-4 py-3", children: [
        /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: member.name }),
        canManage && /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleRemove(member.id), children: /* @__PURE__ */ jsx(UserMinus, { className: "text-destructive h-4 w-4" }) })
      ] }, member.id))
    ] })
  ] });
}
function MilestoneKanban({ project, canManage }) {
  const t = useTranslator();
  const [showForm, setShowForm] = useState(false);
  const [localOrder, setLocalOrder] = useState(project.milestones ?? []);
  const dragId = useRef(null);
  const { data, setData, post, processing, reset } = useForm({
    name: "",
    color: "#6366f1",
    due_date: "",
    description: ""
  });
  const milestones = project.milestones ?? [];
  if (milestones.length !== localOrder.length || milestones.some((m, i) => {
    var _a;
    return m.id !== ((_a = localOrder[i]) == null ? void 0 : _a.id);
  })) {
    if (dragId.current === null) {
      setLocalOrder(milestones);
    }
  }
  function handleCreate(e) {
    e.preventDefault();
    post(route("projects.milestones.store", project.id), {
      preserveScroll: true,
      onSuccess: () => {
        reset();
        setShowForm(false);
      }
    });
  }
  function handleDelete(milestoneId) {
    router.delete(route("projects.milestones.destroy", { project: project.id, milestone: milestoneId }), {
      preserveScroll: true
    });
  }
  function handleDragStart(e, milestoneId) {
    dragId.current = milestoneId;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("milestoneId", milestoneId);
  }
  function handleDragOver(e, targetId) {
    e.preventDefault();
    if (!dragId.current || dragId.current === targetId) return;
    setLocalOrder((prev) => {
      const fromIdx = prev.findIndex((m) => m.id === dragId.current);
      const toIdx = prev.findIndex((m) => m.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }
  function handleDrop(e) {
    e.preventDefault();
    dragId.current = null;
    const ordered_ids = localOrder.map((m) => m.id);
    router.post(
      route("projects.milestones.reorder", project.id),
      { ordered_ids },
      {
        preserveScroll: true,
        onError: () => {
          setLocalOrder(project.milestones ?? []);
        }
      }
    );
  }
  function handleDragEnd() {
    dragId.current = null;
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-3", children: [
      localOrder.map((m) => /* @__PURE__ */ jsx(
        MilestoneCard,
        {
          milestone: m,
          projectId: project.id,
          canManage,
          onDelete: handleDelete,
          onDragStart: handleDragStart,
          onDragOver: handleDragOver,
          onDrop: handleDrop,
          onDragEnd: handleDragEnd
        },
        m.id
      )),
      canManage && /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => setShowForm(true),
          className: "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary flex h-24 w-48 flex-col items-center justify-center rounded-lg border-2 border-dashed text-sm transition",
          children: [
            /* @__PURE__ */ jsx(Plus, { className: "mb-1 h-5 w-5" }),
            t("projects.actions.add_milestone")
          ]
        }
      )
    ] }),
    showForm && /* @__PURE__ */ jsxs("form", { onSubmit: handleCreate, className: "max-w-sm space-y-3 rounded-lg border p-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "ms-name", children: t("projects.milestone.name") }),
        /* @__PURE__ */ jsx(Input, { id: "ms-name", value: data.name, onChange: (e) => setData("name", e.target.value), required: true, maxLength: 191 })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "ms-color", children: t("projects.milestone.color") }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "ms-color",
              type: "color",
              value: data.color,
              onChange: (e) => setData("color", e.target.value),
              className: "h-9 px-1"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "ms-due", children: t("projects.milestone.due_date") }),
          /* @__PURE__ */ jsx(Input, { id: "ms-due", type: "date", value: data.due_date, onChange: (e) => setData("due_date", e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(Button, { type: "submit", size: "sm", disabled: processing, children: t("projects.actions.add_milestone") }),
        /* @__PURE__ */ jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => setShowForm(false), children: t("platform.actions.cancel") ?? "Cancel" })
      ] })
    ] })
  ] });
}
function MilestoneCard({
  milestone,
  projectId,
  canManage,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}) {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      draggable: canManage,
      onDragStart: (e) => onDragStart(e, milestone.id),
      onDragOver: (e) => onDragOver(e, milestone.id),
      onDrop,
      onDragEnd,
      className: "relative flex h-24 w-48 flex-col justify-between rounded-lg border p-3 shadow-sm transition-opacity [&[data-dragging]]:opacity-50",
      style: milestone.color ? { borderLeftColor: milestone.color, borderLeftWidth: 4 } : {},
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex min-w-0 items-start gap-1", children: [
            canManage && /* @__PURE__ */ jsx(GripVertical, { className: "text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0 cursor-grab" }),
            /* @__PURE__ */ jsx("span", { className: "line-clamp-2 text-sm leading-tight font-medium", children: milestone.name })
          ] }),
          canManage && /* @__PURE__ */ jsx("button", { onClick: () => onDelete(milestone.id), className: "text-destructive shrink-0 opacity-50 hover:opacity-100", children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }) })
        ] }),
        milestone.due_date && /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs", children: new Date(milestone.due_date).toLocaleDateString() })
      ]
    }
  );
}
function ProgressCircle({ progress, size = 48 }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress / 100 * circumference;
  return /* @__PURE__ */ jsxs("div", { className: "relative inline-flex items-center justify-center", style: { width: size, height: size }, children: [
    /* @__PURE__ */ jsxs("svg", { width: size, height: size, className: "-rotate-90", children: [
      /* @__PURE__ */ jsx("circle", { cx: size / 2, cy: size / 2, r: radius, strokeWidth: 5, className: "stroke-muted", fill: "none" }),
      /* @__PURE__ */ jsx(
        "circle",
        {
          cx: size / 2,
          cy: size / 2,
          r: radius,
          strokeWidth: 5,
          className: "stroke-primary transition-all duration-300",
          fill: "none",
          strokeDasharray: circumference,
          strokeDashoffset: offset,
          strokeLinecap: "round"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("span", { className: "absolute text-xs font-semibold", children: [
      progress,
      "%"
    ] })
  ] });
}
function ProjectShow({ project, statuses, can, workspaceMembers = [] }) {
  var _a;
  const t = useTranslator();
  const breadcrumbs2 = [
    { title: t("projects.title.index") ?? "Projects", href: route("projects.index") },
    { title: project.name, href: route("projects.show", project.id) }
  ];
  function handleStatusChange(statusId) {
    router.patch(route("projects.status", project.id), { status_id: statusId }, { preserveScroll: true });
  }
  function handleDelete() {
    if (confirm("Delete this project?")) {
      router.delete(route("projects.destroy", project.id));
    }
  }
  function handlePin() {
    router.patch(route("projects.pin", project.id), {}, { preserveScroll: true });
  }
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: project.name }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-4 md:p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(PageHeader, { title: `${project.name} #${project.project_number}`, description: ((_a = project.client) == null ? void 0 : _a.name) ?? "" }),
          project.is_pinned && /* @__PURE__ */ jsx(Pin, { className: "mt-1 h-4 w-4 text-amber-500" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          can.update && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: handlePin, children: [
              /* @__PURE__ */ jsx(Pin, { className: "mr-1 h-4 w-4" }),
              project.is_pinned ? t("projects.actions.unpin") : t("projects.actions.pin")
            ] }),
            /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", asChild: true, children: /* @__PURE__ */ jsxs(Link, { href: route("projects.edit", project.id), children: [
              /* @__PURE__ */ jsx(Edit, { className: "mr-1 h-4 w-4" }),
              t("projects.actions.edit")
            ] }) })
          ] }),
          can.delete && /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "destructive", onClick: handleDelete, children: [
            /* @__PURE__ */ jsx(Trash2, { className: "mr-1 h-4 w-4" }),
            t("projects.actions.delete")
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-6 rounded-lg border p-4", children: [
        /* @__PURE__ */ jsx(ProgressCircle, { progress: project.progress, size: 56 }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: t("projects.fields.status") }),
          can.update ? /* @__PURE__ */ jsxs(Select, { value: project.status_id ?? "", onValueChange: handleStatusChange, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: "h-7 w-36 text-xs", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "—" }) }),
            /* @__PURE__ */ jsx(SelectContent, { children: statuses.map((s) => /* @__PURE__ */ jsx(SelectItem, { value: s.id, children: s.name }, s.id)) })
          ] }) : /* @__PURE__ */ jsx(StatusBadge, { status: project.status })
        ] }),
        project.owner && /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: t("projects.fields.owner") }),
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: project.owner.name })
        ] }),
        project.deadline && /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: t("projects.fields.deadline") }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 text-sm", children: [
            /* @__PURE__ */ jsx(Calendar, { className: "text-muted-foreground h-3.5 w-3.5" }),
            new Date(project.deadline).toLocaleDateString()
          ] })
        ] }),
        project.start_date && /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: t("projects.fields.start_date") }),
          /* @__PURE__ */ jsx("p", { className: "text-sm", children: new Date(project.start_date).toLocaleDateString() })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Tabs, { defaultValue: "overview", children: [
        /* @__PURE__ */ jsxs(TabsList, { children: [
          /* @__PURE__ */ jsx(TabsTrigger, { value: "overview", children: t("projects.tabs.overview") }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "members", children: t("projects.tabs.members") }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "milestones", children: t("projects.tabs.milestones") }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "files", children: t("projects.tabs.files") }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "discussions", children: t("projects.tabs.discussions") }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "activity", children: t("projects.tabs.activity") })
        ] }),
        /* @__PURE__ */ jsxs(TabsContent, { value: "overview", className: "pt-4", children: [
          project.description && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm whitespace-pre-line", children: project.description }),
          !project.description && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: "No description." })
        ] }),
        /* @__PURE__ */ jsx(TabsContent, { value: "members", className: "pt-4", children: /* @__PURE__ */ jsx(MemberList, { project, workspaceMembers, canManage: can.manageMembers }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "milestones", className: "pt-4", children: /* @__PURE__ */ jsx(MilestoneKanban, { project, canManage: can.update }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "files", className: "pt-4", children: /* @__PURE__ */ jsx(FileList, { project, canManage: can.update }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "discussions", className: "pt-4", children: /* @__PURE__ */ jsx(DiscussionThread, { project, canComment: true }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "activity", className: "pt-4", children: /* @__PURE__ */ jsx(ActivityFeed, { activities: project.activities ?? [] }) })
      ] })
    ] })
  ] });
}
const __vite_glob_0_45 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ProjectShow
}, Symbol.toStringTag, { value: "Module" }));
const PRIORITY_STYLES = {
  1: "bg-slate-100 text-slate-600",
  // low
  2: "bg-blue-100 text-blue-700",
  // medium
  3: "bg-orange-100 text-orange-700",
  // high
  4: "bg-red-100 text-red-700"
  // urgent
};
const PRIORITY_KEYS = {
  1: "tasks.priority.low",
  2: "tasks.priority.medium",
  3: "tasks.priority.high",
  4: "tasks.priority.urgent"
};
function PriorityBadge({ priority, className }) {
  const t = useTranslator();
  return /* @__PURE__ */ jsx("span", { className: cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", PRIORITY_STYLES[priority], className), children: t(PRIORITY_KEYS[priority]) });
}
const STANDALONE = "standalone";
function TaskForm({ task, onSuccess, submitRoute, method = "post", relatedRecords = {}, members = [] }) {
  var _a, _b;
  const t = useTranslator();
  const { data, setData, post, patch, processing, errors, reset } = useForm({
    name: (task == null ? void 0 : task.name) ?? "",
    description: (task == null ? void 0 : task.description) ?? "",
    priority: String((task == null ? void 0 : task.priority) ?? 2),
    status: String((task == null ? void 0 : task.status) ?? 1),
    start_date: (task == null ? void 0 : task.start_date) ?? "",
    due_date: (task == null ? void 0 : task.due_date) ?? "",
    related_type: (task == null ? void 0 : task.related_type) ?? "",
    related_id: (task == null ? void 0 : task.related_id) ?? "",
    billable: (task == null ? void 0 : task.billable) ?? false,
    hourly_rate: (task == null ? void 0 : task.hourly_rate) ?? "",
    visible_to_customer: (task == null ? void 0 : task.visible_to_customer) ?? false,
    lock_version: (task == null ? void 0 : task.lock_version) ?? 0,
    assignee_ids: ((_a = task == null ? void 0 : task.assignees) == null ? void 0 : _a.map((a) => a.id)) ?? []
  });
  function handleSubmit(e) {
    e.preventDefault();
    const submit = method === "patch" ? patch : post;
    submit(submitRoute, { onSuccess });
  }
  function handleRelatedTypeChange(v) {
    const newType = v === STANDALONE ? "" : v;
    setData((prev) => ({ ...prev, related_type: newType, related_id: "" }));
  }
  function toggleAssignee(userId) {
    setData(
      "assignee_ids",
      data.assignee_ids.includes(userId) ? data.assignee_ids.filter((id) => id !== userId) : [...data.assignee_ids, userId]
    );
  }
  const PRIORITIES = [
    { value: "1", label: t("tasks.priority.low") ?? "Low" },
    { value: "2", label: t("tasks.priority.medium") ?? "Medium" },
    { value: "3", label: t("tasks.priority.high") ?? "High" },
    { value: "4", label: t("tasks.priority.urgent") ?? "Urgent" }
  ];
  const RELATED_TYPES = [
    { value: STANDALONE, label: t("tasks.related_type.standalone") ?? "Standalone" },
    { value: "lead", label: t("tasks.related_type.lead") ?? "Lead" },
    { value: "client", label: t("tasks.related_type.client") ?? "Client" },
    { value: "project", label: t("tasks.related_type.project") ?? "Project" },
    { value: "contact", label: t("tasks.related_type.contact") ?? "Contact" }
  ];
  const activeRelatedType = data.related_type;
  const relatedOptions = activeRelatedType ? relatedRecords[activeRelatedType] ?? [] : [];
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Label, { htmlFor: "name", children: t("tasks.fields.name") }),
      /* @__PURE__ */ jsx(Input, { id: "name", value: data.name, onChange: (e) => setData("name", e.target.value), required: true }),
      /* @__PURE__ */ jsx(InputError, { message: errors.name })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Label, { htmlFor: "description", children: t("tasks.fields.description") }),
      /* @__PURE__ */ jsx(Textarea, { id: "description", value: data.description, onChange: (e) => setData("description", e.target.value), rows: 3 }),
      /* @__PURE__ */ jsx(InputError, { message: errors.description })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: t("tasks.fields.priority") }),
        /* @__PURE__ */ jsxs(Select, { value: data.priority, onValueChange: (v) => setData("priority", v), children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsx(SelectContent, { children: PRIORITIES.map((p) => /* @__PURE__ */ jsx(SelectItem, { value: p.value, children: p.label }, p.value)) })
        ] }),
        /* @__PURE__ */ jsx(InputError, { message: errors.priority })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: t("tasks.fields.related_to") }),
        /* @__PURE__ */ jsxs(Select, { value: data.related_type || STANDALONE, onValueChange: handleRelatedTypeChange, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsx(SelectContent, { children: RELATED_TYPES.map((rt) => /* @__PURE__ */ jsx(SelectItem, { value: rt.value, children: rt.label }, rt.value)) })
        ] })
      ] })
    ] }),
    activeRelatedType && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Label, { children: ((_b = RELATED_TYPES.find((rt) => rt.value === activeRelatedType)) == null ? void 0 : _b.label) ?? activeRelatedType }),
      /* @__PURE__ */ jsxs(Select, { value: data.related_id || "", onValueChange: (v) => setData("related_id", v), children: [
        /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: t("tasks.fields.related_to") ?? "Select..." }) }),
        /* @__PURE__ */ jsx(SelectContent, { children: relatedOptions.length === 0 ? /* @__PURE__ */ jsx("div", { className: "text-muted-foreground px-2 py-2 text-sm", children: "—" }) : relatedOptions.map((rec) => /* @__PURE__ */ jsx(SelectItem, { value: rec.id, children: rec.name }, rec.id)) })
      ] }),
      /* @__PURE__ */ jsx(InputError, { message: errors.related_id })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "start_date", children: t("tasks.fields.start_date") }),
        /* @__PURE__ */ jsx(Input, { id: "start_date", type: "date", value: data.start_date, onChange: (e) => setData("start_date", e.target.value) }),
        /* @__PURE__ */ jsx(InputError, { message: errors.start_date })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "due_date", children: t("tasks.fields.due_date") }),
        /* @__PURE__ */ jsx(Input, { id: "due_date", type: "date", value: data.due_date, onChange: (e) => setData("due_date", e.target.value) }),
        /* @__PURE__ */ jsx(InputError, { message: errors.due_date })
      ] })
    ] }),
    members.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Label, { children: t("tasks.fields.assignees") ?? "Assignees" }),
      /* @__PURE__ */ jsx("div", { className: "mt-1 max-h-32 space-y-1 overflow-y-auto rounded-md border p-2", children: members.map((m) => /* @__PURE__ */ jsxs("label", { className: "flex cursor-pointer items-center gap-2 text-sm", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "checkbox",
            checked: data.assignee_ids.includes(m.id),
            onChange: () => toggleAssignee(m.id),
            className: "rounded"
          }
        ),
        m.name
      ] }, m.id)) }),
      /* @__PURE__ */ jsx(InputError, { message: errors.assignee_ids })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Switch, { id: "billable", checked: data.billable, onCheckedChange: (v) => setData("billable", v) }),
        /* @__PURE__ */ jsx(Label, { htmlFor: "billable", children: t("tasks.fields.billable") })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Switch, { id: "visible_to_customer", checked: data.visible_to_customer, onCheckedChange: (v) => setData("visible_to_customer", v) }),
        /* @__PURE__ */ jsx(Label, { htmlFor: "visible_to_customer", children: t("tasks.fields.visible_to_customer") })
      ] })
    ] }),
    data.billable && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Label, { htmlFor: "hourly_rate", children: t("tasks.fields.hourly_rate") }),
      /* @__PURE__ */ jsx(
        Input,
        {
          id: "hourly_rate",
          type: "number",
          step: "0.01",
          value: data.hourly_rate,
          onChange: (e) => setData("hourly_rate", e.target.value)
        }
      ),
      /* @__PURE__ */ jsx(InputError, { message: errors.hourly_rate })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex justify-end gap-2", children: /* @__PURE__ */ jsx(Button, { type: "submit", disabled: processing, children: task ? t("tasks.actions.edit") : t("tasks.actions.create") }) })
  ] });
}
const STATUS_STYLES = {
  1: "bg-slate-100 text-slate-700",
  // not_started
  2: "bg-yellow-100 text-yellow-800",
  // awaiting_feedback
  3: "bg-blue-100 text-blue-800",
  // testing
  4: "bg-purple-100 text-purple-800",
  // in_progress
  5: "bg-green-100 text-green-800"
  // complete
};
const STATUS_KEYS$1 = {
  1: "tasks.status.not_started",
  2: "tasks.status.awaiting_feedback",
  3: "tasks.status.testing",
  4: "tasks.status.in_progress",
  5: "tasks.status.complete"
};
function TaskStatusBadge({ status, className }) {
  const t = useTranslator();
  return /* @__PURE__ */ jsx("span", { className: cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[status], className), children: t(STATUS_KEYS$1[status]) });
}
const STATUS_LABELS = {
  "1": "tasks.status.not_started",
  "2": "tasks.status.awaiting_feedback",
  "3": "tasks.status.testing",
  "4": "tasks.status.in_progress",
  "5": "tasks.status.complete"
};
function TasksIndex({ tasks, filters, can, relatedRecords, members }) {
  const t = useTranslator();
  const [search, setSearch] = useState(filters.search ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const breadcrumbs2 = [{ title: t("tasks.title.index") ?? "Tasks", href: route("tasks.index") }];
  const applyFilter = useCallback(
    (params) => {
      router.get(route("tasks.index"), { ...filters, ...params }, { preserveState: true, replace: true });
    },
    [filters]
  );
  function handleSearch(e) {
    e.preventDefault();
    applyFilter({ search });
  }
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("tasks.title.index") ?? "Tasks" }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-4 md:p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("h1", { className: "text-xl font-semibold", children: t("tasks.title.index") }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", asChild: true, children: /* @__PURE__ */ jsx(Link, { href: route("tasks.kanban"), children: t("tasks.title.kanban") }) }),
          can.create && /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => setCreateOpen(true), children: [
            /* @__PURE__ */ jsx(Plus, { className: "mr-1 h-4 w-4" }),
            t("tasks.actions.create")
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxs("form", { onSubmit: handleSearch, className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              placeholder: t("tasks.actions.search") ?? "Search...",
              value: search,
              onChange: (e) => setSearch(e.target.value),
              className: "w-56"
            }
          ),
          /* @__PURE__ */ jsx(Button, { type: "submit", variant: "outline", size: "sm", children: t("tasks.actions.search") })
        ] }),
        /* @__PURE__ */ jsxs(Select, { value: filters.status ?? "all", onValueChange: (v) => applyFilter({ status: v === "all" ? "" : v }), children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-44", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: t("tasks.filters.all_statuses") }) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "all", children: t("tasks.filters.all_statuses") }),
            Object.entries(STATUS_LABELS).map(([v, key]) => /* @__PURE__ */ jsx(SelectItem, { value: v, children: t(key) }, v))
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "rounded-lg border", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "#" }),
          /* @__PURE__ */ jsx(TableHead, { children: t("tasks.fields.name") }),
          /* @__PURE__ */ jsx(TableHead, { children: t("tasks.fields.status") }),
          /* @__PURE__ */ jsx(TableHead, { children: t("tasks.fields.priority") }),
          /* @__PURE__ */ jsx(TableHead, { children: t("tasks.fields.assignees") }),
          /* @__PURE__ */ jsx(TableHead, { children: t("tasks.fields.due_date") })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: tasks.data.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 6, className: "text-muted-foreground py-8 text-center", children: t("tasks.kanban.empty_column") }) }) : tasks.data.map((task) => {
          var _a;
          return /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxs(TableCell, { className: "text-muted-foreground", children: [
              "#",
              task.task_number
            ] }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Link, { href: route("tasks.show", { task: task.id }), className: "font-medium hover:underline", children: task.name }) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(TaskStatusBadge, { status: task.status }) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(PriorityBadge, { priority: task.priority }) }),
            /* @__PURE__ */ jsx(TableCell, { children: ((_a = task.assignees) == null ? void 0 : _a.map((a) => a.name).join(", ")) ?? "—" }),
            /* @__PURE__ */ jsx(TableCell, { children: task.due_date ?? "—" })
          ] }, task.id);
        }) })
      ] }) }),
      (tasks.prev_page_url || tasks.next_page_url) && /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2", children: [
        tasks.prev_page_url && /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", asChild: true, children: /* @__PURE__ */ jsx(Link, { href: tasks.prev_page_url, children: "←" }) }),
        /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground flex items-center text-sm", children: [
          tasks.current_page,
          " / ",
          tasks.last_page
        ] }),
        tasks.next_page_url && /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", asChild: true, children: /* @__PURE__ */ jsx(Link, { href: tasks.next_page_url, children: "→" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: createOpen, onOpenChange: setCreateOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[90vh] overflow-y-auto sm:max-w-lg", children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: t("tasks.actions.create") }) }),
      /* @__PURE__ */ jsx(
        TaskForm,
        {
          submitRoute: route("tasks.store"),
          relatedRecords,
          members,
          onSuccess: () => setCreateOpen(false)
        }
      )
    ] }) })
  ] });
}
const __vite_glob_0_46 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: TasksIndex
}, Symbol.toStringTag, { value: "Module" }));
function TaskCard({ task, draggable, onDragStart }) {
  useTranslator();
  const isOverdue = task.due_date && !task.finished_at && new Date(task.due_date) < /* @__PURE__ */ new Date();
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "rounded-md border bg-white p-3 shadow-sm transition-shadow hover:shadow-md",
      draggable,
      onDragStart: draggable && onDragStart ? (e) => onDragStart(e, task.id) : void 0,
      children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-2 flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsxs(Link, { href: route("tasks.show", { task: task.id }), className: "line-clamp-2 text-sm font-medium hover:underline", children: [
            "#",
            task.task_number,
            " ",
            task.name
          ] }),
          /* @__PURE__ */ jsx(PriorityBadge, { priority: task.priority })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsx(TaskStatusBadge, { status: task.status }),
          task.due_date && /* @__PURE__ */ jsxs("span", { className: `flex items-center gap-1 text-xs ${isOverdue ? "text-red-600" : "text-muted-foreground"}`, children: [
            /* @__PURE__ */ jsx(CalendarDays, { className: "h-3 w-3" }),
            new Date(task.due_date).toLocaleDateString()
          ] }),
          task.milestone && /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs", children: task.milestone.name })
        ] }),
        task.assignees && task.assignees.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-2 flex -space-x-1.5", children: [
          task.assignees.slice(0, 4).map((assignee) => /* @__PURE__ */ jsx(Avatar, { className: "h-6 w-6 border-2 border-white", children: /* @__PURE__ */ jsx(AvatarFallback, { className: "text-[10px]", children: assignee.name.charAt(0).toUpperCase() }) }, assignee.id)),
          task.assignees.length > 4 && /* @__PURE__ */ jsxs("span", { className: "bg-muted text-muted-foreground flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px]", children: [
            "+",
            task.assignees.length - 4
          ] })
        ] })
      ]
    }
  );
}
function TaskKanbanColumn({ status, label, tasks, canUpdate }) {
  const t = useTranslator();
  const [isDragOver, setIsDragOver] = useState(false);
  function handleDragStart(e, taskId) {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.setData("fromStatus", String(status));
  }
  function handleDragOver(e) {
    e.preventDefault();
    setIsDragOver(true);
  }
  function handleDragLeave() {
    setIsDragOver(false);
  }
  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData("taskId");
    const fromStatus = parseInt(e.dataTransfer.getData("fromStatus"), 10);
    if (!taskId || !canUpdate) return;
    if (fromStatus === status) return;
    router.patch(route("tasks.kanban-order", { task: taskId }), {
      status,
      order: tasks.length + 1
    });
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `bg-muted/40 flex min-h-[200px] w-72 flex-shrink-0 flex-col rounded-lg border p-2 transition-colors ${isDragOver ? "border-primary bg-primary/5" : ""}`,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-3 flex items-center justify-between px-1", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold", children: label }),
          /* @__PURE__ */ jsx("span", { className: "bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs", children: tasks.length })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-2", children: tasks.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground py-4 text-center text-xs", children: t("tasks.kanban.empty_column") }) : tasks.map((task) => /* @__PURE__ */ jsx(TaskCard, { task, draggable: canUpdate, onDragStart: handleDragStart }, task.id)) })
      ]
    }
  );
}
const STATUS_DISPLAY_ORDER = [1, 4, 3, 2, 5];
const STATUS_KEYS = {
  1: "tasks.status.not_started",
  2: "tasks.status.awaiting_feedback",
  3: "tasks.status.testing",
  4: "tasks.status.in_progress",
  5: "tasks.status.complete"
};
function TasksKanban({ columns, can, relatedRecords = {}, members = [] }) {
  const t = useTranslator();
  const [createOpen, setCreateOpen] = useState(false);
  const breadcrumbs2 = [
    { title: t("tasks.title.index") ?? "Tasks", href: route("tasks.index") },
    { title: t("tasks.title.kanban") ?? "Kanban", href: route("tasks.kanban") }
  ];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("tasks.title.kanban") ?? "Kanban" }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-4 p-4 md:p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("h1", { className: "text-xl font-semibold", children: t("tasks.title.kanban") }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", asChild: true, children: /* @__PURE__ */ jsx(Link, { href: route("tasks.index"), children: t("tasks.title.index") }) }),
          can.create && /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => setCreateOpen(true), children: [
            /* @__PURE__ */ jsx(Plus, { className: "mr-1 h-4 w-4" }),
            t("tasks.actions.create")
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: t("tasks.kanban.drag_hint") }),
      /* @__PURE__ */ jsx("div", { className: "flex gap-4 overflow-x-auto pb-4", children: STATUS_DISPLAY_ORDER.map((status) => /* @__PURE__ */ jsx(
        TaskKanbanColumn,
        {
          status,
          label: t(STATUS_KEYS[status]) ?? String(status),
          tasks: columns[String(status)] ?? [],
          canUpdate: can.update
        },
        status
      )) })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: createOpen, onOpenChange: setCreateOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[90vh] overflow-y-auto sm:max-w-lg", children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: t("tasks.actions.create") }) }),
      /* @__PURE__ */ jsx(
        TaskForm,
        {
          submitRoute: route("tasks.store"),
          onSuccess: () => setCreateOpen(false),
          relatedRecords,
          members
        }
      )
    ] }) })
  ] });
}
const __vite_glob_0_47 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: TasksKanban
}, Symbol.toStringTag, { value: "Module" }));
function ChecklistPanel({ task, canUpdate }) {
  const t = useTranslator();
  const { data, setData, post, processing, reset } = useForm({
    description: "",
    assigned_user_id: null
  });
  const items = task.checklist_items ?? [];
  const doneCount = items.filter((i) => i.finished).length;
  function handleAdd(e) {
    e.preventDefault();
    if (!data.description.trim()) return;
    post(route("tasks.checklist.store", { task: task.id }), {
      onSuccess: () => reset()
    });
  }
  function handleToggle(item) {
    router.patch(route("tasks.checklist.toggle", { task: task.id, item: item.id }));
  }
  function handleDelete(item) {
    router.delete(route("tasks.checklist.destroy", { task: task.id, item: item.id }));
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold", children: t("tasks.title.checklist") }),
      items.length > 0 && /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground text-xs", children: [
        doneCount,
        "/",
        items.length
      ] })
    ] }),
    items.length > 0 && /* @__PURE__ */ jsx("div", { className: "bg-muted h-1.5 w-full overflow-hidden rounded-full", children: /* @__PURE__ */ jsx(
      "div",
      {
        className: "h-full bg-green-500 transition-all",
        style: { width: `${items.length > 0 ? doneCount / items.length * 100 : 0}%` }
      }
    ) }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      items.map((item) => /* @__PURE__ */ jsxs("div", { className: "hover:bg-muted/40 flex items-center gap-2 rounded px-1 py-1", children: [
        /* @__PURE__ */ jsx(Checkbox, { checked: item.finished, onCheckedChange: () => canUpdate && handleToggle(item), disabled: !canUpdate }),
        /* @__PURE__ */ jsx("span", { className: `flex-1 text-sm ${item.finished ? "text-muted-foreground line-through" : ""}`, children: item.description }),
        canUpdate && /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-6 w-6", onClick: () => handleDelete(item), children: /* @__PURE__ */ jsx(Trash2, { className: "h-3 w-3" }) })
      ] }, item.id)),
      items.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: t("tasks.checklist.empty") })
    ] }),
    canUpdate && /* @__PURE__ */ jsxs("form", { onSubmit: handleAdd, className: "flex gap-2", children: [
      /* @__PURE__ */ jsx(
        Input,
        {
          placeholder: t("tasks.checklist.placeholder") ?? "Add item...",
          value: data.description,
          onChange: (e) => setData("description", e.target.value),
          className: "h-8 text-sm"
        }
      ),
      /* @__PURE__ */ jsx(Button, { type: "submit", size: "sm", disabled: processing, children: /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }) })
    ] })
  ] });
}
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}
function TimerWidget({ task, canLogTime }) {
  const t = useTranslator();
  const timers = task.timers ?? [];
  const runningTimer = timers.find((t2) => t2.end_time === null);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!runningTimer) {
      setElapsed(0);
      return;
    }
    const startedAt = new Date(runningTimer.start_time).getTime();
    function tick() {
      setElapsed(Math.floor((Date.now() - startedAt) / 1e3));
    }
    tick();
    const id = setInterval(tick, 1e3);
    return () => clearInterval(id);
  }, [runningTimer == null ? void 0 : runningTimer.id]);
  const { data, setData, post, processing, reset } = useForm({
    start_time: "",
    end_time: "",
    note: ""
  });
  function handleStart() {
    router.post(route("tasks.timers.start", { task: task.id }));
  }
  function handleStop() {
    if (!runningTimer) return;
    router.patch(route("tasks.timers.stop", { task: task.id, timer: runningTimer.id }));
  }
  function handleLogManual(e) {
    e.preventDefault();
    post(route("tasks.timers.log", { task: task.id }), {
      onSuccess: () => reset()
    });
  }
  function handleDelete(timer) {
    router.delete(route("tasks.timers.destroy", { task: task.id, timer: timer.id }));
  }
  const isBilled = task.billed;
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold", children: t("tasks.timer.title") }),
      canLogTime && !isBilled && /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: runningTimer ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("span", { className: "font-mono text-sm text-green-600", children: formatDuration(elapsed) }),
        /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: handleStop, children: [
          /* @__PURE__ */ jsx(Square, { className: "mr-1 h-3 w-3" }),
          t("tasks.actions.stop_timer")
        ] })
      ] }) : /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: handleStart, children: [
        /* @__PURE__ */ jsx(Play, { className: "mr-1 h-3 w-3" }),
        t("tasks.actions.start_timer")
      ] }) }),
      isBilled && /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs", children: t("tasks.timer.billed_locked") })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      timers.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: t("tasks.timer.empty") }),
      timers.map((timer) => {
        var _a;
        return /* @__PURE__ */ jsxs("div", { className: "hover:bg-muted/40 flex items-center gap-2 rounded px-1 py-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: (_a = timer.user) == null ? void 0 : _a.name }),
          /* @__PURE__ */ jsx("span", { className: "flex-1 font-mono text-xs", children: formatDuration(timer.duration_seconds) }),
          timer.end_time === null && /* @__PURE__ */ jsx("span", { className: "rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700", children: t("tasks.timer.running") }),
          !isBilled && /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-6 w-6", onClick: () => handleDelete(timer), children: /* @__PURE__ */ jsx(Trash2, { className: "h-3 w-3" }) })
        ] }, timer.id);
      })
    ] }),
    canLogTime && !isBilled && /* @__PURE__ */ jsxs("details", { className: "text-sm", children: [
      /* @__PURE__ */ jsx("summary", { className: "text-muted-foreground hover:text-foreground cursor-pointer", children: t("tasks.timer.manual_entry") }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleLogManual, className: "mt-2 space-y-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { className: "text-xs", children: t("tasks.fields.start_time") }),
            /* @__PURE__ */ jsx(
              Input,
              {
                type: "datetime-local",
                value: data.start_time,
                onChange: (e) => setData("start_time", e.target.value),
                className: "h-8 text-xs"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { className: "text-xs", children: t("tasks.fields.end_time") }),
            /* @__PURE__ */ jsx(
              Input,
              {
                type: "datetime-local",
                value: data.end_time,
                onChange: (e) => setData("end_time", e.target.value),
                className: "h-8 text-xs"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          Input,
          {
            placeholder: t("tasks.fields.note") ?? "Note",
            value: data.note,
            onChange: (e) => setData("note", e.target.value),
            className: "h-8 text-xs"
          }
        ),
        /* @__PURE__ */ jsx(Button, { type: "submit", size: "sm", disabled: processing, className: "w-full", children: t("tasks.actions.log_time") })
      ] })
    ] })
  ] });
}
const STATUS_OPTIONS = [
  { value: "1", labelKey: "tasks.status.not_started" },
  { value: "2", labelKey: "tasks.status.awaiting_feedback" },
  { value: "3", labelKey: "tasks.status.testing" },
  { value: "4", labelKey: "tasks.status.in_progress" },
  { value: "5", labelKey: "tasks.status.complete" }
];
function TaskShow({ task, can, relatedRecords = {}, members = [] }) {
  var _a;
  const t = useTranslator();
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignProcessing, setAssignProcessing] = useState(false);
  const breadcrumbs2 = [
    { title: t("tasks.title.index") ?? "Tasks", href: route("tasks.index") },
    { title: `#${task.task_number} ${task.name}`, href: route("tasks.show", { task: task.id }) }
  ];
  function handleStatusChange(value) {
    router.patch(route("tasks.status", { task: task.id }), { status: parseInt(value, 10) });
  }
  function handleDelete() {
    if (!confirm(t("tasks.actions.delete") ?? "Delete?")) return;
    router.delete(route("tasks.destroy", { task: task.id }));
  }
  function syncAssignees(newIds) {
    setAssignProcessing(true);
    router.patch(route("tasks.assignees.update", { task: task.id }), { user_ids: newIds }, { onFinish: () => setAssignProcessing(false) });
  }
  function toggleAssignee(userId) {
    var _a2;
    const current = ((_a2 = task.assignees) == null ? void 0 : _a2.map((a) => a.id)) ?? [];
    const updated = current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId];
    syncAssignees(updated);
  }
  const assigneeIds = ((_a = task.assignees) == null ? void 0 : _a.map((a) => a.id)) ?? [];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: `#${task.task_number} ${task.name}` }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-6 p-4 md:p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "text-muted-foreground flex items-center gap-2 text-sm", children: [
            "#",
            task.task_number,
            task.related_type && /* @__PURE__ */ jsxs("span", { children: [
              "· ",
              t(`tasks.related_type.${task.related_type}`)
            ] })
          ] }),
          /* @__PURE__ */ jsx("h1", { className: "text-xl font-semibold", children: task.name }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsx(TaskStatusBadge, { status: task.status }),
            /* @__PURE__ */ jsx(PriorityBadge, { priority: task.priority }),
            task.due_date && /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground flex items-center gap-1 text-sm", children: [
              /* @__PURE__ */ jsx(CalendarDays, { className: "h-3 w-3" }),
              task.due_date
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          can.update && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs(Select, { value: String(task.status), onValueChange: handleStatusChange, children: [
              /* @__PURE__ */ jsx(SelectTrigger, { className: "w-44", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsx(SelectContent, { children: STATUS_OPTIONS.map((s) => /* @__PURE__ */ jsx(SelectItem, { value: s.value, children: t(s.labelKey) }, s.value)) })
            ] }),
            /* @__PURE__ */ jsx(Button, { variant: "outline", size: "icon", onClick: () => setEditOpen(true), children: /* @__PURE__ */ jsx(Edit, { className: "h-4 w-4" }) })
          ] }),
          can.delete && /* @__PURE__ */ jsx(Button, { variant: "destructive", size: "icon", onClick: handleDelete, children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-6 lg:grid-cols-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-6 lg:col-span-2", children: [
          task.description && /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h3", { className: "mb-1 text-sm font-semibold", children: t("tasks.fields.description") }),
            /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm whitespace-pre-wrap", children: task.description })
          ] }),
          /* @__PURE__ */ jsx(Separator, {}),
          /* @__PURE__ */ jsx(ChecklistPanel, { task, canUpdate: can.update }),
          /* @__PURE__ */ jsx(Separator, {}),
          /* @__PURE__ */ jsx(TimerWidget, { task, canLogTime: can.log_time })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { className: "mb-1 flex items-center justify-between", children: [
              /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold", children: t("tasks.fields.assignees") }),
              can.update && members.length > 0 && /* @__PURE__ */ jsxs(Popover, { open: assignOpen, onOpenChange: setAssignOpen, children: [
                /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-6 w-6", children: assignProcessing ? /* @__PURE__ */ jsx(Loader2, { className: "h-3 w-3 animate-spin" }) : /* @__PURE__ */ jsx(Users, { className: "h-3 w-3" }) }) }),
                /* @__PURE__ */ jsx(PopoverContent, { className: "w-56 p-2", children: /* @__PURE__ */ jsx("div", { className: "space-y-1", children: members.map((m) => /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    className: "hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm",
                    onClick: () => toggleAssignee(m.id),
                    disabled: assignProcessing,
                    children: [
                      m.name,
                      assigneeIds.includes(m.id) && /* @__PURE__ */ jsx("span", { className: "text-primary ml-auto text-xs", children: "✓" })
                    ]
                  },
                  m.id
                )) }) })
              ] })
            ] }),
            task.assignees && task.assignees.length > 0 ? /* @__PURE__ */ jsx("div", { className: "space-y-1", children: task.assignees.map((a) => /* @__PURE__ */ jsx("div", { className: "text-sm", children: a.name }, a.id)) }) : /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-sm", children: "—" })
          ] }),
          task.milestone && /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h3", { className: "mb-1 text-sm font-semibold", children: t("tasks.fields.milestone") }),
            /* @__PURE__ */ jsx("span", { className: "text-sm", children: task.milestone.name })
          ] }),
          task.tags && task.tags.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h3", { className: "mb-1 text-sm font-semibold", children: "Tags" }),
            /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1", children: task.tags.map((tag) => /* @__PURE__ */ jsx(
              "span",
              {
                className: "rounded-full px-2 py-0.5 text-xs font-medium",
                style: { backgroundColor: tag.color ?? "#e2e8f0" },
                children: tag.name
              },
              tag.id
            )) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-sm", children: [
            task.start_date && /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: t("tasks.fields.start_date") }),
              /* @__PURE__ */ jsx("span", { children: task.start_date })
            ] }),
            task.due_date && /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: t("tasks.fields.due_date") }),
              /* @__PURE__ */ jsx("span", { children: task.due_date })
            ] })
          ] })
        ] })
      ] })
    ] }),
    can.update && /* @__PURE__ */ jsx(Dialog, { open: editOpen, onOpenChange: setEditOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[90vh] overflow-y-auto sm:max-w-lg", children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: t("tasks.actions.edit") ?? "Edit Task" }) }),
      /* @__PURE__ */ jsx(
        TaskForm,
        {
          task,
          submitRoute: route("tasks.update", { task: task.id }),
          method: "patch",
          onSuccess: () => setEditOpen(false),
          relatedRecords,
          members
        }
      )
    ] }) })
  ] });
}
const __vite_glob_0_48 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: TaskShow
}, Symbol.toStringTag, { value: "Module" }));
const LOCALES = ["vi", "en"];
function LanguageTabs({ className = "", ...props }) {
  const t = useTranslator();
  const { locale } = usePage().props;
  const setLocale = (next) => {
    if (next !== locale) {
      router.put(route("locale"), { locale: next }, { preserveScroll: true });
    }
  };
  return /* @__PURE__ */ jsx("div", { className: cn("bg-secondary inline-flex gap-1 rounded-lg p-1", className), ...props, children: LOCALES.map((code) => /* @__PURE__ */ jsx(
    "button",
    {
      onClick: () => setLocale(code),
      className: cn(
        "rounded-md px-3.5 py-1.5 text-sm transition-colors",
        locale === code ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      ),
      children: t(`platform.locale.${code}`)
    },
    code
  )) });
}
const breadcrumbs$2 = [
  {
    title: "Appearance settings",
    href: "/settings/appearance"
  }
];
function Appearance() {
  const t = useTranslator();
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs$2, children: [
    /* @__PURE__ */ jsx(Head, { title: "Appearance settings" }),
    /* @__PURE__ */ jsx(SettingsLayout, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsx(HeadingSmall, { title: "Appearance settings", description: "Update your account's appearance settings" }),
      /* @__PURE__ */ jsx(AppearanceToggleTab, {}),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: t("platform.locale.label") }),
        /* @__PURE__ */ jsx(LanguageTabs, {})
      ] })
    ] }) })
  ] });
}
const __vite_glob_0_49 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Appearance
}, Symbol.toStringTag, { value: "Module" }));
const OPTION_TYPES = ["select", "multiselect", "checkbox"];
const DEFAULT_FORM = {
  entity_type: "",
  name: "",
  field_type: "",
  options: [],
  default_value: "",
  required: false,
  active: true,
  field_order: 0,
  bs_column: 12,
  show_on_table: false,
  show_on_client_portal: false,
  disallow_client_edit: false,
  only_admin: false
};
function CustomFieldForm({ open, onClose, entityTypes, fieldTypes, definition, storeRoute, updateRoute }) {
  const t = useTranslator();
  const isEditing = definition != null;
  const { data, setData, post, put, reset, errors, processing, clearErrors } = useForm(DEFAULT_FORM);
  const [newOptionInput, setNewOptionInput] = useState("");
  useEffect(() => {
    if (open) {
      if (definition) {
        setData({
          entity_type: definition.entity_type,
          name: definition.name,
          field_type: definition.field_type,
          options: definition.options ?? [],
          default_value: "",
          required: definition.required,
          active: definition.active,
          field_order: definition.field_order,
          bs_column: definition.bs_column,
          show_on_table: definition.show_on_table,
          show_on_client_portal: definition.show_on_client_portal,
          disallow_client_edit: definition.disallow_client_edit,
          only_admin: definition.only_admin
        });
      } else {
        reset();
      }
      clearErrors();
      setNewOptionInput("");
    }
  }, [open, definition]);
  const fieldType = data.field_type;
  const requiresOptions = OPTION_TYPES.includes(fieldType);
  const addOption = () => {
    const opt = newOptionInput.trim();
    if (!opt || data.options.includes(opt)) return;
    setData("options", [...data.options, opt]);
    setNewOptionInput("");
  };
  const removeOption = (opt) => {
    setData(
      "options",
      data.options.filter((o) => o !== opt)
    );
  };
  const submit = () => {
    const opts = {
      preserveScroll: true,
      onSuccess: () => {
        onClose();
        reset();
      }
    };
    if (isEditing && updateRoute) {
      put(updateRoute, opts);
    } else {
      post(storeRoute, opts);
    }
  };
  const handleClose = () => {
    onClose();
    reset();
    clearErrors();
  };
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange: (o) => !o && handleClose(), children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[85vh] overflow-y-auto sm:max-w-lg", children: [
    /* @__PURE__ */ jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsx(DialogTitle, { children: isEditing ? t("custom_fields.actions.edit") : t("custom_fields.actions.add") }),
      /* @__PURE__ */ jsx(DialogDescription, { children: t("custom_fields.dialog_description") ?? "Configure the custom field definition below." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-4 py-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx(Label, { children: t("custom_fields.fields.entity_type") }),
        /* @__PURE__ */ jsxs(Select, { value: data.entity_type, onValueChange: (v) => setData("entity_type", v), disabled: isEditing, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: t("custom_fields.select_entity") }) }),
          /* @__PURE__ */ jsx(SelectContent, { children: entityTypes.map((et) => /* @__PURE__ */ jsx(SelectItem, { value: et, children: t(`custom_fields.entity_types.${et}`) }, et)) })
        ] }),
        /* @__PURE__ */ jsx(InputError, { message: errors.entity_type })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx(Label, { children: t("custom_fields.fields.name") }),
        /* @__PURE__ */ jsx(Input, { value: data.name, onChange: (e) => setData("name", e.target.value), autoFocus: !isEditing, maxLength: 150 }),
        /* @__PURE__ */ jsx(InputError, { message: errors.name })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx(Label, { children: t("custom_fields.fields.field_type") }),
        /* @__PURE__ */ jsxs(Select, { value: data.field_type, onValueChange: (v) => setData("field_type", v), disabled: isEditing, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: t("custom_fields.fields.field_type") }) }),
          /* @__PURE__ */ jsx(SelectContent, { children: fieldTypes.map((ft) => /* @__PURE__ */ jsx(SelectItem, { value: ft, children: t(`custom_fields.field_types.${ft}`) }, ft)) })
        ] }),
        isEditing && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: t("custom_fields.immutable_hint") }),
        /* @__PURE__ */ jsx(InputError, { message: errors.field_type })
      ] }),
      requiresOptions && /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx(Label, { children: t("custom_fields.fields.options") }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          data.options.map((opt) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "bg-muted flex-1 rounded px-3 py-1.5 text-sm", children: opt }),
            /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => removeOption(opt), className: "h-8 w-8 p-0", children: /* @__PURE__ */ jsx(X, { className: "size-3.5" }) })
          ] }, opt)),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                value: newOptionInput,
                onChange: (e) => setNewOptionInput(e.target.value),
                onKeyDown: (e) => e.key === "Enter" && (e.preventDefault(), addOption()),
                placeholder: t("custom_fields.fields.add_option"),
                className: "flex-1"
              }
            ),
            /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: addOption, children: /* @__PURE__ */ jsx(Plus, { className: "size-4" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsx(InputError, { message: errors.options })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3", children: [
        ["required", "custom_fields.fields.required"],
        ["active", "custom_fields.fields.active"],
        ["show_on_table", "custom_fields.fields.show_on_table"],
        ["only_admin", "custom_fields.fields.only_admin"]
      ].map(([field, labelKey]) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Checkbox, { id: field, checked: data[field], onCheckedChange: (c) => setData(field, c === true) }),
        /* @__PURE__ */ jsx(Label, { htmlFor: field, className: "font-normal", children: t(labelKey) })
      ] }, field)) }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsx(Label, { children: t("custom_fields.fields.order") }),
        /* @__PURE__ */ jsx(
          Input,
          {
            type: "number",
            min: 0,
            value: data.field_order,
            onChange: (e) => setData("field_order", parseInt(e.target.value) || 0),
            className: "w-32"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { message: errors.field_order })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: handleClose, disabled: processing, children: t("custom_fields.actions.cancel") }),
      /* @__PURE__ */ jsx(Button, { onClick: submit, disabled: processing, children: t("custom_fields.actions.save") })
    ] })
  ] }) });
}
function CustomFieldsIndex({ definitions, entityTypes, fieldTypes, optionTypes, activeEntity }) {
  const t = useTranslator();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const breadcrumbs2 = [{ title: t("custom_fields.title"), href: "/settings/custom-fields" }];
  const changeEntity = (entityType) => {
    router.get(route("custom-fields.index"), { entity_type: entityType }, { preserveScroll: true, replace: true });
  };
  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };
  const openEdit = (definition) => {
    setEditTarget(definition);
    setFormOpen(true);
  };
  const confirmDelete = () => {
    if (!deleteTarget) return;
    router.delete(route("custom-fields.destroy", deleteTarget.id), {
      preserveScroll: true,
      onSuccess: () => setDeleteTarget(null)
    });
  };
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("custom_fields.title") }),
    /* @__PURE__ */ jsx(SettingsLayout, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [
        /* @__PURE__ */ jsx(HeadingSmall, { title: t("custom_fields.title"), description: t("custom_fields.subtitle") }),
        /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: openCreate, children: [
          /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
          t("custom_fields.actions.add")
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground text-sm", children: [
          t("custom_fields.fields.entity_type"),
          ":"
        ] }),
        /* @__PURE__ */ jsxs(Select, { value: activeEntity, onValueChange: changeEntity, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-52", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsx(SelectContent, { children: entityTypes.map((et) => /* @__PURE__ */ jsx(SelectItem, { value: et, children: t(`custom_fields.entity_types.${et}`) }, et)) })
        ] })
      ] }),
      definitions.data.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: t("custom_fields.empty") }) : /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: t("custom_fields.fields.name") }),
          /* @__PURE__ */ jsx(TableHead, { children: t("custom_fields.fields.field_type") }),
          /* @__PURE__ */ jsx(TableHead, { children: t("custom_fields.fields.slug") }),
          /* @__PURE__ */ jsx(TableHead, { children: t("custom_fields.fields.required") }),
          /* @__PURE__ */ jsx(TableHead, { children: t("custom_fields.fields.active") }),
          /* @__PURE__ */ jsx(TableHead, { children: t("custom_fields.fields.order") }),
          /* @__PURE__ */ jsx(TableHead, {})
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: definitions.data.map((definition) => /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: definition.name }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground text-sm", children: t(`custom_fields.field_types.${definition.field_type}`) }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground font-mono text-xs", children: definition.slug }),
          /* @__PURE__ */ jsx(TableCell, { children: definition.required ? /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-green-600", children: "✓" }) : /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs", children: "—" }) }),
          /* @__PURE__ */ jsx(TableCell, { children: definition.active ? /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-green-600", children: "✓" }) : /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs", children: "—" }) }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground text-sm", children: definition.field_order }),
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: () => openEdit(definition), className: "h-8 w-8 p-0", children: /* @__PURE__ */ jsx(Pencil, { className: "size-3.5" }) }),
            /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: () => setDeleteTarget(definition), className: "h-8 w-8 p-0", children: /* @__PURE__ */ jsx(Trash2, { className: "text-destructive size-3.5" }) })
          ] }) })
        ] }, definition.id)) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(
      CustomFieldForm,
      {
        open: formOpen,
        onClose: () => setFormOpen(false),
        entityTypes,
        fieldTypes,
        definition: editTarget,
        storeRoute: route("custom-fields.store"),
        updateRoute: editTarget ? route("custom-fields.update", editTarget.id) : void 0
      }
    ),
    /* @__PURE__ */ jsx(Dialog, { open: deleteTarget !== null, onOpenChange: (o) => !o && setDeleteTarget(null), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: t("custom_fields.actions.delete") }) }),
      /* @__PURE__ */ jsx("p", { className: "text-sm", children: t("custom_fields.actions.delete_confirm") }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setDeleteTarget(null), children: t("custom_fields.actions.cancel") }),
        /* @__PURE__ */ jsx(Button, { variant: "destructive", onClick: confirmDelete, children: t("custom_fields.actions.delete") })
      ] })
    ] }) })
  ] });
}
const __vite_glob_0_50 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: CustomFieldsIndex
}, Symbol.toStringTag, { value: "Module" }));
function LookupTable({ items, storeRoute, updateRouteFn, deleteRouteFn, addLabel, emptyLabel, showColor = false }) {
  const t = useTranslator();
  const [dialog, setDialog] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { data, setData, post, patch, reset, errors, processing } = useForm({
    name: "",
    color: ""
  });
  const openCreate = () => {
    reset();
    setData({ name: "", color: "" });
    setDialog({ mode: "create" });
  };
  const openEdit = (item) => {
    setData({ name: item.name, color: item.color ?? "" });
    setDialog({ mode: "edit", item });
  };
  const submit = () => {
    if (!dialog) return;
    const opts = {
      preserveScroll: true,
      onSuccess: () => {
        setDialog(null);
        reset();
      }
    };
    if (dialog.mode === "create") {
      post(storeRoute, opts);
    } else {
      patch(updateRouteFn(dialog.item.id), opts);
    }
  };
  const confirmDelete = () => {
    if (!deleteTarget) return;
    router.delete(deleteRouteFn(deleteTarget.id), {
      preserveScroll: true,
      onSuccess: () => setDeleteTarget(null)
    });
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: openCreate, children: [
        /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
        addLabel
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "rounded-xl border", children: items.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground p-4 text-sm", children: emptyLabel }) : /* @__PURE__ */ jsx("ul", { className: "divide-y", children: items.map((item) => /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between px-4 py-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          showColor && item.color && /* @__PURE__ */ jsx("span", { className: "inline-block size-4 rounded-full border", style: { backgroundColor: item.color } }),
          /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: item.name })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-1", children: [
          /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", onClick: () => openEdit(item), children: /* @__PURE__ */ jsx(Pencil, { className: "size-4" }) }),
          /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", onClick: () => setDeleteTarget(item), children: /* @__PURE__ */ jsx(Trash2, { className: "text-destructive size-4" }) })
        ] })
      ] }, item.id)) }) })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: dialog !== null, onOpenChange: (open) => !open && setDialog(null), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: (dialog == null ? void 0 : dialog.mode) === "create" ? addLabel : t("lookups.actions.edit") }),
        /* @__PURE__ */ jsx(DialogDescription, { children: t("lookups.dialog_description") ?? "Enter the details below." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { children: t("lookups.lead_sources.name") }),
          /* @__PURE__ */ jsx(Input, { value: data.name, onChange: (e) => setData("name", e.target.value), autoFocus: true }),
          /* @__PURE__ */ jsx(InputError, { message: errors.name })
        ] }),
        showColor && /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { children: t("lookups.project_statuses.color") }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "color",
              value: data.color || "#94a3b8",
              onChange: (e) => setData("color", e.target.value),
              className: "h-10 w-20 cursor-pointer p-1"
            }
          ),
          /* @__PURE__ */ jsx(InputError, { message: errors.color })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setDialog(null), children: t("lookups.actions.cancel") }),
        /* @__PURE__ */ jsx(Button, { onClick: submit, disabled: processing, children: t("lookups.actions.save") })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: deleteTarget !== null, onOpenChange: (open) => !open && setDeleteTarget(null), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: t("lookups.actions.delete") }),
        /* @__PURE__ */ jsx(DialogDescription, { children: t("lookups.delete_dialog_description") ?? "This action cannot be undone." })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm", children: t("lookups.lead_sources.delete_confirm") }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setDeleteTarget(null), children: t("lookups.actions.cancel") }),
        /* @__PURE__ */ jsx(Button, { variant: "destructive", onClick: confirmDelete, children: t("lookups.actions.delete") })
      ] })
    ] }) })
  ] });
}
const __vite_glob_0_51 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: LookupTable
}, Symbol.toStringTag, { value: "Module" }));
function StageList({ pipelineId, stages, stageTypes, storeRoute }) {
  const t = useTranslator();
  const [dialog, setDialog] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { data, setData, post, patch, reset, errors, processing } = useForm({
    name: "",
    color: "#3b82f6",
    probability: 0,
    type: "open",
    stage_order: stages.length
  });
  const openCreate = () => {
    setData({ name: "", color: "#3b82f6", probability: 0, type: "open", stage_order: stages.length });
    setDialog({ mode: "create" });
  };
  const openEdit = (stage) => {
    setData({
      name: stage.name,
      color: stage.color ?? "#3b82f6",
      probability: stage.probability,
      type: stage.type,
      stage_order: stage.stage_order
    });
    setDialog({ mode: "edit", stage });
  };
  const submit = () => {
    if (!dialog) return;
    const opts = {
      preserveScroll: true,
      onSuccess: () => {
        setDialog(null);
        reset();
      }
    };
    if (dialog.mode === "create") {
      post(storeRoute, opts);
    } else {
      patch(route("lookups.stage.update", dialog.stage.id), opts);
    }
  };
  const confirmDelete = () => {
    if (!deleteTarget) return;
    router.delete(route("lookups.stage.destroy", deleteTarget.id), {
      preserveScroll: true,
      onSuccess: () => setDeleteTarget(null)
    });
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: "mt-2 space-y-2 pl-4", children: [
      stages.map((stage) => /* @__PURE__ */ jsxs("div", { className: "bg-muted/30 flex items-center justify-between rounded-lg border px-3 py-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          stage.color && /* @__PURE__ */ jsx("span", { className: "inline-block size-3 rounded-full", style: { backgroundColor: stage.color } }),
          /* @__PURE__ */ jsx("span", { className: "text-sm", children: stage.name }),
          /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground text-xs", children: [
            "(",
            t(`lookups.pipelines.type.${stage.type}`),
            ")"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-1", children: [
          /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: () => openEdit(stage), children: t("lookups.actions.edit") }),
          /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: () => setDeleteTarget(stage), children: /* @__PURE__ */ jsx(Trash2, { className: "text-destructive size-4" }) })
        ] })
      ] }, stage.id)),
      /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", onClick: openCreate, children: [
        /* @__PURE__ */ jsx(Plus, { className: "mr-1 size-3" }),
        t("lookups.pipelines.add_stage")
      ] })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: dialog !== null, onOpenChange: (open) => !open && setDialog(null), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: (dialog == null ? void 0 : dialog.mode) === "create" ? t("lookups.pipelines.add_stage") : t("lookups.actions.edit") }),
        /* @__PURE__ */ jsx(DialogDescription, { children: t("lookups.dialog_description") ?? "Enter the details below." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { children: t("lookups.pipelines.stage_name") }),
          /* @__PURE__ */ jsx(Input, { value: data.name, onChange: (e) => setData("name", e.target.value), autoFocus: true }),
          /* @__PURE__ */ jsx(InputError, { message: errors.name })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { children: t("lookups.pipelines.stage_type") }),
          /* @__PURE__ */ jsxs(Select, { value: data.type, onValueChange: (v) => setData("type", v), children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsx(SelectContent, { children: stageTypes.map((type) => /* @__PURE__ */ jsx(SelectItem, { value: type, children: t(`lookups.pipelines.type.${type}`) }, type)) })
          ] }),
          /* @__PURE__ */ jsx(InputError, { message: errors.type })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
            /* @__PURE__ */ jsx(Label, { children: t("lookups.pipelines.stage_color") }),
            /* @__PURE__ */ jsx(
              Input,
              {
                type: "color",
                value: data.color,
                onChange: (e) => setData("color", e.target.value),
                className: "h-10 w-20 cursor-pointer p-1"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
            /* @__PURE__ */ jsx(Label, { children: t("lookups.pipelines.stage_probability") }),
            /* @__PURE__ */ jsx(
              Input,
              {
                type: "number",
                min: 0,
                max: 100,
                value: data.probability,
                onChange: (e) => setData("probability", Number(e.target.value))
              }
            ),
            /* @__PURE__ */ jsx(InputError, { message: errors.probability })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setDialog(null), children: t("lookups.actions.cancel") }),
        /* @__PURE__ */ jsx(Button, { onClick: submit, disabled: processing, children: t("lookups.actions.save") })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: deleteTarget !== null, onOpenChange: (open) => !open && setDeleteTarget(null), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: t("lookups.actions.delete") }),
        /* @__PURE__ */ jsx(DialogDescription, { children: t("lookups.delete_dialog_description") ?? "This action cannot be undone." })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm", children: t("lookups.pipelines.delete_confirm") }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setDeleteTarget(null), children: t("lookups.actions.cancel") }),
        /* @__PURE__ */ jsx(Button, { variant: "destructive", onClick: confirmDelete, children: t("lookups.actions.delete") })
      ] })
    ] }) })
  ] });
}
const __vite_glob_0_52 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: StageList
}, Symbol.toStringTag, { value: "Module" }));
function LeadSourcesSettings({ sources }) {
  const t = useTranslator();
  const breadcrumbs2 = [{ title: t("lookups.lead_sources.title"), href: "/settings/lookups/lead-sources" }];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("lookups.lead_sources.title") }),
    /* @__PURE__ */ jsx(SettingsLayout, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsx(HeadingSmall, { title: t("lookups.lead_sources.title"), description: t("lookups.lead_sources.subtitle") }),
      /* @__PURE__ */ jsx(
        LookupTable,
        {
          items: sources,
          storeRoute: route("lookups.lead-sources.store"),
          updateRouteFn: (id) => route("lookups.lead-sources.update", id),
          deleteRouteFn: (id) => route("lookups.lead-sources.destroy", id),
          addLabel: t("lookups.lead_sources.add"),
          emptyLabel: t("lookups.lead_sources.empty"),
          showColor: false
        }
      )
    ] }) })
  ] });
}
const __vite_glob_0_53 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: LeadSourcesSettings
}, Symbol.toStringTag, { value: "Module" }));
function PipelinesSettings({ pipelines, stageTypes }) {
  const t = useTranslator();
  const [dialog, setDialog] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { data, setData, post, patch, reset, errors, processing } = useForm({
    name: "",
    is_default: false
  });
  const openCreate = () => {
    setData({ name: "", is_default: false });
    setDialog({ mode: "create" });
  };
  const openEdit = (pipeline) => {
    setData({ name: pipeline.name, is_default: pipeline.is_default });
    setDialog({ mode: "edit", pipeline });
  };
  const submit = () => {
    if (!dialog) return;
    const opts = {
      preserveScroll: true,
      onSuccess: () => {
        setDialog(null);
        reset();
      }
    };
    if (dialog.mode === "create") {
      post(route("lookups.pipelines.store"), opts);
    } else {
      patch(route("lookups.pipelines.update", dialog.pipeline.id), opts);
    }
  };
  const confirmDelete = () => {
    if (!deleteTarget) return;
    router.delete(route("lookups.pipelines.destroy", deleteTarget.id), {
      preserveScroll: true,
      onSuccess: () => setDeleteTarget(null)
    });
  };
  const breadcrumbs2 = [{ title: t("lookups.pipelines.title"), href: "/settings/lookups/pipelines" }];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("lookups.pipelines.title") }),
    /* @__PURE__ */ jsxs(SettingsLayout, { children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4", children: [
          /* @__PURE__ */ jsx(HeadingSmall, { title: t("lookups.pipelines.title"), description: t("lookups.pipelines.subtitle") }),
          /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: openCreate, children: [
            /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
            t("lookups.pipelines.add")
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-4", children: pipelines.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: t("lookups.pipelines.empty") }) : pipelines.map((pipeline) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl border p-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsx("span", { className: "font-semibold", children: pipeline.name }),
              pipeline.is_default && /* @__PURE__ */ jsx("span", { className: "bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs", children: t("lookups.pipelines.is_default") })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-1", children: [
              /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: () => openEdit(pipeline), children: t("lookups.actions.edit") }),
              /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: () => setDeleteTarget(pipeline), children: /* @__PURE__ */ jsx(Trash2, { className: "text-destructive size-4" }) })
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            StageList,
            {
              pipelineId: pipeline.id,
              stages: pipeline.stages,
              stageTypes,
              storeRoute: route("lookups.stages.store", pipeline.id)
            }
          )
        ] }, pipeline.id)) })
      ] }),
      /* @__PURE__ */ jsx(Dialog, { open: dialog !== null, onOpenChange: (open) => !open && setDialog(null), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxs(DialogHeader, { children: [
          /* @__PURE__ */ jsx(DialogTitle, { children: (dialog == null ? void 0 : dialog.mode) === "create" ? t("lookups.pipelines.add") : t("lookups.actions.edit") }),
          /* @__PURE__ */ jsx(DialogDescription, { children: t("lookups.dialog_description") ?? "Enter the details below." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
            /* @__PURE__ */ jsx(Label, { children: t("lookups.pipelines.name") }),
            /* @__PURE__ */ jsx(Input, { value: data.name, onChange: (e) => setData("name", e.target.value), autoFocus: true }),
            /* @__PURE__ */ jsx(InputError, { message: errors.name })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(
              Checkbox,
              {
                id: "is_default",
                checked: data.is_default,
                onCheckedChange: (checked) => setData("is_default", checked === true)
              }
            ),
            /* @__PURE__ */ jsx(Label, { htmlFor: "is_default", children: t("lookups.pipelines.is_default") })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setDialog(null), children: t("lookups.actions.cancel") }),
          /* @__PURE__ */ jsx(Button, { onClick: submit, disabled: processing, children: t("lookups.actions.save") })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Dialog, { open: deleteTarget !== null, onOpenChange: (open) => !open && setDeleteTarget(null), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxs(DialogHeader, { children: [
          /* @__PURE__ */ jsx(DialogTitle, { children: t("lookups.actions.delete") }),
          /* @__PURE__ */ jsx(DialogDescription, { children: t("lookups.delete_dialog_description") ?? "This action cannot be undone." })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-sm", children: t("lookups.pipelines.delete_confirm") }),
        /* @__PURE__ */ jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setDeleteTarget(null), children: t("lookups.actions.cancel") }),
          /* @__PURE__ */ jsx(Button, { variant: "destructive", onClick: confirmDelete, children: t("lookups.actions.delete") })
        ] })
      ] }) })
    ] })
  ] });
}
const __vite_glob_0_54 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: PipelinesSettings
}, Symbol.toStringTag, { value: "Module" }));
function ProjectStatusesSettings({ statuses }) {
  const t = useTranslator();
  const breadcrumbs2 = [{ title: t("lookups.project_statuses.title"), href: "/settings/lookups/project-statuses" }];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("lookups.project_statuses.title") }),
    /* @__PURE__ */ jsx(SettingsLayout, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsx(HeadingSmall, { title: t("lookups.project_statuses.title"), description: t("lookups.project_statuses.subtitle") }),
      /* @__PURE__ */ jsx(
        LookupTable,
        {
          items: statuses,
          storeRoute: route("lookups.project-statuses.store"),
          updateRouteFn: (id) => route("lookups.project-statuses.update", id),
          deleteRouteFn: (id) => route("lookups.project-statuses.destroy", id),
          addLabel: t("lookups.project_statuses.add"),
          emptyLabel: t("lookups.project_statuses.empty"),
          showColor: true
        }
      )
    ] }) })
  ] });
}
const __vite_glob_0_55 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ProjectStatusesSettings
}, Symbol.toStringTag, { value: "Module" }));
const NO_TEAM = "none";
function MembersSettings({ members, teams, roles }) {
  const t = useTranslator();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [form, setForm] = useState({ email: "", role: roles[0], team_id: NO_TEAM });
  const [error, setError] = useState();
  const teamValue = (id) => id ?? NO_TEAM;
  const toTeamId = (value) => value === NO_TEAM ? null : value;
  const submitInvite = () => {
    router.post(
      route("members.store"),
      { email: form.email, role: form.role, team_id: toTeamId(form.team_id) },
      { preserveScroll: true, onSuccess: () => setInviteOpen(false), onError: (e) => setError(Object.values(e)[0]) }
    );
  };
  const submitEdit = () => {
    if (!editing) return;
    router.patch(
      route("members.update", editing.id),
      { role: editing.role, team_id: toTeamId(editing.team_id ?? NO_TEAM) },
      { preserveScroll: true, onSuccess: () => setEditing(null), onError: (e) => setError(Object.values(e)[0]) }
    );
  };
  const confirmDeactivate = () => {
    if (deactivating) {
      router.delete(route("members.destroy", deactivating.id), { preserveScroll: true, onSuccess: () => setDeactivating(null) });
    }
  };
  const breadcrumbs2 = [{ title: t("platform.members.title"), href: "/settings/members" }];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("platform.members.title") }),
    /* @__PURE__ */ jsxs(SettingsLayout, { children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4", children: [
          /* @__PURE__ */ jsx(HeadingSmall, { title: t("platform.members.title"), description: t("platform.members.subtitle") }),
          /* @__PURE__ */ jsxs(
            Button,
            {
              size: "sm",
              onClick: () => {
                setForm({ email: "", role: roles[0], team_id: NO_TEAM });
                setError(void 0);
                setInviteOpen(true);
              },
              children: [
                /* @__PURE__ */ jsx(UserPlus, { className: "mr-2 size-4" }),
                t("platform.members.invite")
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "rounded-xl border", children: /* @__PURE__ */ jsxs(Table, { children: [
          /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableHead, { children: t("platform.members.email") }),
            /* @__PURE__ */ jsx(TableHead, { children: t("platform.members.role") }),
            /* @__PURE__ */ jsx(TableHead, { children: t("platform.members.team") }),
            /* @__PURE__ */ jsx(TableHead, { children: t("platform.members.status") }),
            /* @__PURE__ */ jsx(TableHead, { className: "w-10" })
          ] }) }),
          /* @__PURE__ */ jsx(TableBody, { children: members.map((member) => /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxs(TableCell, { children: [
              /* @__PURE__ */ jsx("div", { className: "font-medium", children: member.name }),
              /* @__PURE__ */ jsx("div", { className: "text-muted-foreground text-xs", children: member.email })
            ] }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: t(`platform.roles.${member.role}`) }) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-sm", children: member.team_name ?? t("platform.members.no_team") }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: member.status === "active" ? "default" : "outline", children: t(`platform.statuses.${member.status}`) }) }),
            /* @__PURE__ */ jsx(TableCell, { children: !member.is_self && /* @__PURE__ */ jsxs(DropdownMenu, { children: [
              /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "size-7", children: /* @__PURE__ */ jsx(MoreHorizontal, { className: "size-4" }) }) }),
              /* @__PURE__ */ jsxs(DropdownMenuContent, { align: "end", children: [
                /* @__PURE__ */ jsx(
                  DropdownMenuItem,
                  {
                    onClick: () => {
                      setEditing(member);
                      setError(void 0);
                    },
                    children: t("platform.actions.edit")
                  }
                ),
                /* @__PURE__ */ jsx(
                  DropdownMenuItem,
                  {
                    className: "text-destructive focus:text-destructive",
                    onClick: () => setDeactivating(member),
                    children: t("platform.members.deactivate")
                  }
                )
              ] })
            ] }) })
          ] }, member.id)) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx(Dialog, { open: inviteOpen, onOpenChange: setInviteOpen, children: /* @__PURE__ */ jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: t("platform.members.invite") }) }),
        /* @__PURE__ */ jsxs("div", { className: "grid gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "invite-email", children: t("platform.members.email") }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "invite-email",
                type: "email",
                value: form.email,
                onChange: (e) => setForm({ ...form, email: e.target.value }),
                autoFocus: true
              }
            )
          ] }),
          /* @__PURE__ */ jsx(
            RoleSelect,
            {
              label: t("platform.members.role"),
              value: form.role,
              roles,
              onChange: (role) => setForm({ ...form, role }),
              t
            }
          ),
          /* @__PURE__ */ jsx(
            TeamSelect,
            {
              label: t("platform.members.team"),
              value: form.team_id,
              teams,
              onChange: (team_id) => setForm({ ...form, team_id }),
              t
            }
          ),
          /* @__PURE__ */ jsx(InputError, { message: error })
        ] }),
        /* @__PURE__ */ jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setInviteOpen(false), children: t("platform.actions.cancel") }),
          /* @__PURE__ */ jsx(Button, { onClick: submitInvite, children: t("platform.actions.invite") })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Dialog, { open: editing !== null, onOpenChange: (open) => !open && setEditing(null), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: editing == null ? void 0 : editing.name }) }),
        editing && /* @__PURE__ */ jsxs("div", { className: "grid gap-4", children: [
          /* @__PURE__ */ jsx(
            RoleSelect,
            {
              label: t("platform.members.role"),
              value: editing.role,
              roles,
              onChange: (role) => setEditing({ ...editing, role }),
              t
            }
          ),
          /* @__PURE__ */ jsx(
            TeamSelect,
            {
              label: t("platform.members.team"),
              value: teamValue(editing.team_id),
              teams,
              onChange: (team_id) => setEditing({ ...editing, team_id: toTeamId(team_id) }),
              t
            }
          ),
          /* @__PURE__ */ jsx(InputError, { message: error })
        ] }),
        /* @__PURE__ */ jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setEditing(null), children: t("platform.actions.cancel") }),
          /* @__PURE__ */ jsx(Button, { onClick: submitEdit, children: t("platform.actions.save") })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Dialog, { open: deactivating !== null, onOpenChange: (open) => !open && setDeactivating(null), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxs(DialogHeader, { children: [
          /* @__PURE__ */ jsx(DialogTitle, { children: t("platform.members.deactivate") }),
          /* @__PURE__ */ jsx(DialogDescription, { children: t("platform.members.deactivate_confirm") })
        ] }),
        /* @__PURE__ */ jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setDeactivating(null), children: t("platform.actions.cancel") }),
          /* @__PURE__ */ jsx(Button, { variant: "destructive", onClick: confirmDeactivate, children: t("platform.members.deactivate") })
        ] })
      ] }) })
    ] })
  ] });
}
function RoleSelect({
  label,
  value,
  roles,
  onChange,
  t
}) {
  return /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
    /* @__PURE__ */ jsx(Label, { children: label }),
    /* @__PURE__ */ jsxs(Select, { value, onValueChange: onChange, children: [
      /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
      /* @__PURE__ */ jsx(SelectContent, { children: roles.map((role) => /* @__PURE__ */ jsx(SelectItem, { value: role, children: t(`platform.roles.${role}`) }, role)) })
    ] })
  ] });
}
function TeamSelect({
  label,
  value,
  teams,
  onChange,
  t
}) {
  return /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
    /* @__PURE__ */ jsx(Label, { children: label }),
    /* @__PURE__ */ jsxs(Select, { value, onValueChange: onChange, children: [
      /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
      /* @__PURE__ */ jsxs(SelectContent, { children: [
        /* @__PURE__ */ jsx(SelectItem, { value: NO_TEAM, children: t("platform.members.no_team") }),
        teams.map((team) => /* @__PURE__ */ jsx(SelectItem, { value: team.id, children: team.name }, team.id))
      ] })
    ] })
  ] });
}
const __vite_glob_0_56 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: MembersSettings
}, Symbol.toStringTag, { value: "Module" }));
const breadcrumbs$1 = [
  {
    title: "Password settings",
    href: "/settings/password"
  }
];
function Password() {
  const passwordInput = useRef(null);
  const currentPasswordInput = useRef(null);
  const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
    current_password: "",
    password: "",
    password_confirmation: ""
  });
  const updatePassword = (e) => {
    e.preventDefault();
    put(route("password.update"), {
      preserveScroll: true,
      onSuccess: () => reset(),
      onError: (errors2) => {
        var _a, _b;
        if (errors2.password) {
          reset("password", "password_confirmation");
          (_a = passwordInput.current) == null ? void 0 : _a.focus();
        }
        if (errors2.current_password) {
          reset("current_password");
          (_b = currentPasswordInput.current) == null ? void 0 : _b.focus();
        }
      }
    });
  };
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs$1, children: [
    /* @__PURE__ */ jsx(Head, { title: "Profile settings" }),
    /* @__PURE__ */ jsx(SettingsLayout, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsx(HeadingSmall, { title: "Update password", description: "Ensure your account is using a long, random password to stay secure" }),
      /* @__PURE__ */ jsxs("form", { onSubmit: updatePassword, className: "space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "current_password", children: "Current password" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "current_password",
              ref: currentPasswordInput,
              value: data.current_password,
              onChange: (e) => setData("current_password", e.target.value),
              type: "password",
              className: "mt-1 block w-full",
              autoComplete: "current-password",
              placeholder: "Current password"
            }
          ),
          /* @__PURE__ */ jsx(InputError, { message: errors.current_password })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "password", children: "New password" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "password",
              ref: passwordInput,
              value: data.password,
              onChange: (e) => setData("password", e.target.value),
              type: "password",
              className: "mt-1 block w-full",
              autoComplete: "new-password",
              placeholder: "New password"
            }
          ),
          /* @__PURE__ */ jsx(InputError, { message: errors.password })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "password_confirmation", children: "Confirm password" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "password_confirmation",
              value: data.password_confirmation,
              onChange: (e) => setData("password_confirmation", e.target.value),
              type: "password",
              className: "mt-1 block w-full",
              autoComplete: "new-password",
              placeholder: "Confirm password"
            }
          ),
          /* @__PURE__ */ jsx(InputError, { message: errors.password_confirmation })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx(Button, { disabled: processing, children: "Save password" }),
          /* @__PURE__ */ jsx(
            Transition,
            {
              show: recentlySuccessful,
              enter: "transition ease-in-out",
              enterFrom: "opacity-0",
              leave: "transition ease-in-out",
              leaveTo: "opacity-0",
              children: /* @__PURE__ */ jsx("p", { className: "text-sm text-neutral-600", children: "Saved" })
            }
          )
        ] })
      ] })
    ] }) })
  ] });
}
const __vite_glob_0_57 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Password
}, Symbol.toStringTag, { value: "Module" }));
function DeleteUser() {
  const passwordInput = useRef(null);
  const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm({ password: "" });
  const deleteUser = (e) => {
    e.preventDefault();
    destroy(route("profile.destroy"), {
      preserveScroll: true,
      onSuccess: () => closeModal(),
      onError: () => {
        var _a;
        return (_a = passwordInput.current) == null ? void 0 : _a.focus();
      },
      onFinish: () => reset()
    });
  };
  const closeModal = () => {
    clearErrors();
    reset();
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsx(HeadingSmall, { title: "Delete account", description: "Delete your account and all of its resources" }),
    /* @__PURE__ */ jsxs("div", { className: "border-destructive/20 bg-destructive/10 space-y-4 rounded-lg border p-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-destructive relative space-y-0.5", children: [
        /* @__PURE__ */ jsx("p", { className: "font-medium", children: "Warning" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm", children: "Please proceed with caution, this cannot be undone." })
      ] }),
      /* @__PURE__ */ jsxs(Dialog, { children: [
        /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "destructive", children: "Delete account" }) }),
        /* @__PURE__ */ jsxs(DialogContent, { children: [
          /* @__PURE__ */ jsx(DialogTitle, { children: "Are you sure you want to delete your account?" }),
          /* @__PURE__ */ jsx(DialogDescription, { children: "Once your account is deleted, all of its resources and data will also be permanently deleted. Please enter your password to confirm you would like to permanently delete your account." }),
          /* @__PURE__ */ jsxs("form", { className: "space-y-6", onSubmit: deleteUser, children: [
            /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "password", className: "sr-only", children: "Password" }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  id: "password",
                  type: "password",
                  name: "password",
                  ref: passwordInput,
                  value: data.password,
                  onChange: (e) => setData("password", e.target.value),
                  placeholder: "Password",
                  autoComplete: "current-password"
                }
              ),
              /* @__PURE__ */ jsx(InputError, { message: errors.password })
            ] }),
            /* @__PURE__ */ jsxs(DialogFooter, { children: [
              /* @__PURE__ */ jsx(DialogClose, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "secondary", onClick: closeModal, children: "Cancel" }) }),
              /* @__PURE__ */ jsx(Button, { variant: "destructive", disabled: processing, asChild: true, children: /* @__PURE__ */ jsx("button", { type: "submit", children: "Delete account" }) })
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}
const breadcrumbs = [
  {
    title: "Profile settings",
    href: "/settings/profile"
  }
];
function Profile({ mustVerifyEmail, status }) {
  const { auth } = usePage().props;
  const user = auth.user;
  const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
    name: user.name,
    email: user.email
  });
  const submit = (e) => {
    e.preventDefault();
    patch(route("profile.update"));
  };
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs, children: [
    /* @__PURE__ */ jsx(Head, { title: "Profile settings" }),
    /* @__PURE__ */ jsxs(SettingsLayout, { children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsx(HeadingSmall, { title: "Profile information", description: "Update your name and email address" }),
        /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "space-y-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "name", children: "Name" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "name",
                className: "mt-1 block w-full",
                value: data.name,
                onChange: (e) => setData("name", e.target.value),
                required: true,
                autoComplete: "name",
                placeholder: "Full name"
              }
            ),
            /* @__PURE__ */ jsx(InputError, { className: "mt-2", message: errors.name })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "Email address" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "email",
                type: "email",
                className: "mt-1 block w-full",
                value: data.email,
                onChange: (e) => setData("email", e.target.value),
                required: true,
                autoComplete: "username",
                placeholder: "Email address"
              }
            ),
            /* @__PURE__ */ jsx(InputError, { className: "mt-2", message: errors.email })
          ] }),
          mustVerifyEmail && user.email_verified_at === null && /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("p", { className: "mt-2 text-sm text-neutral-800", children: [
              "Your email address is unverified.",
              /* @__PURE__ */ jsx(
                Link,
                {
                  href: route("verification.send"),
                  method: "post",
                  as: "button",
                  className: "rounded-md text-sm text-neutral-600 underline hover:text-neutral-900 focus:ring-2 focus:ring-offset-2 focus:outline-hidden",
                  children: "Click here to re-send the verification email."
                }
              )
            ] }),
            status === "verification-link-sent" && /* @__PURE__ */ jsx("div", { className: "mt-2 text-sm font-medium text-green-600", children: "A new verification link has been sent to your email address." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
            /* @__PURE__ */ jsx(Button, { disabled: processing, children: "Save" }),
            /* @__PURE__ */ jsx(
              Transition,
              {
                show: recentlySuccessful,
                enter: "transition ease-in-out",
                enterFrom: "opacity-0",
                leave: "transition ease-in-out",
                leaveTo: "opacity-0",
                children: /* @__PURE__ */ jsx("p", { className: "text-sm text-neutral-600", children: "Saved" })
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(DeleteUser, {})
    ] })
  ] });
}
const __vite_glob_0_58 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Profile
}, Symbol.toStringTag, { value: "Module" }));
function TeamNode({ node, depth, onAddChild, onRename, onMove, onDelete }) {
  const t = useTranslator();
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: "hover:bg-muted flex items-center gap-2 rounded-lg px-2 py-2",
        style: { paddingLeft: `${depth * 1.25 + 0.5}rem` },
        children: [
          /* @__PURE__ */ jsx(FolderTree, { className: "text-muted-foreground size-4 shrink-0" }),
          /* @__PURE__ */ jsx("span", { className: "flex-1 truncate text-sm font-medium", children: node.name }),
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs tabular-nums", children: t("platform.teams.members_count", { count: node.member_count }) }),
          /* @__PURE__ */ jsxs(DropdownMenu, { children: [
            /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "size-7", children: /* @__PURE__ */ jsx(MoreHorizontal, { className: "size-4" }) }) }),
            /* @__PURE__ */ jsxs(DropdownMenuContent, { align: "end", children: [
              /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => onAddChild(node.id), children: [
                /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
                t("platform.teams.add_child")
              ] }),
              /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => onRename(node), children: [
                /* @__PURE__ */ jsx(Pencil, { className: "mr-2 size-4" }),
                t("platform.actions.rename")
              ] }),
              /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => onMove(node), children: [
                /* @__PURE__ */ jsx(FolderTree, { className: "mr-2 size-4" }),
                t("platform.actions.move")
              ] }),
              /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => onDelete(node), className: "text-destructive focus:text-destructive", children: [
                /* @__PURE__ */ jsx(Trash2, { className: "mr-2 size-4" }),
                t("platform.actions.delete")
              ] })
            ] })
          ] })
        ]
      }
    ),
    node.children.map((child) => /* @__PURE__ */ jsx(
      TeamNode,
      {
        node: child,
        depth: depth + 1,
        onAddChild,
        onRename,
        onMove,
        onDelete
      },
      child.id
    ))
  ] });
}
function buildTree(teams) {
  const byParent = /* @__PURE__ */ new Map();
  teams.forEach((team) => {
    const bucket = byParent.get(team.parent_id) ?? [];
    bucket.push({ ...team, children: [] });
    byParent.set(team.parent_id, bucket);
  });
  const attach = (parentId) => (byParent.get(parentId) ?? []).map((node) => ({ ...node, children: attach(node.id) }));
  return attach(null);
}
function TeamsSettings({ teams }) {
  const t = useTranslator();
  const tree = useMemo(() => buildTree(teams), [teams]);
  const [dialog, setDialog] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState(null);
  const [error, setError] = useState();
  const openCreate = (parent = null) => {
    setDialog({ mode: "create", parentId: parent });
    setName("");
    setError(void 0);
  };
  const openRename = (node) => {
    setDialog({ mode: "rename", team: node });
    setName(node.name);
    setError(void 0);
  };
  const openMove = (node) => {
    setDialog({ mode: "reparent", team: node });
    setParentId(node.parent_id);
    setError(void 0);
  };
  const submit = () => {
    const opts = {
      preserveScroll: true,
      onSuccess: () => setDialog(null),
      onError: (errors) => setError(Object.values(errors)[0])
    };
    if ((dialog == null ? void 0 : dialog.mode) === "create") {
      router.post(route("teams.store"), { name, parent_id: dialog.parentId ?? null }, opts);
    } else if ((dialog == null ? void 0 : dialog.mode) === "rename" && dialog.team) {
      router.patch(route("teams.update", dialog.team.id), { name }, opts);
    } else if ((dialog == null ? void 0 : dialog.mode) === "reparent" && dialog.team) {
      router.patch(route("teams.reparent", dialog.team.id), { parent_id: parentId }, opts);
    }
  };
  const confirmDelete = () => {
    if (deleteTarget) {
      router.delete(route("teams.destroy", deleteTarget.id), { preserveScroll: true, onSuccess: () => setDeleteTarget(null) });
    }
  };
  const breadcrumbs2 = [{ title: t("platform.teams.title"), href: "/settings/teams" }];
  const dialogTitle = (dialog == null ? void 0 : dialog.mode) === "rename" ? t("platform.actions.rename") : (dialog == null ? void 0 : dialog.mode) === "reparent" ? t("platform.actions.move") : t("platform.teams.add");
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("platform.teams.title") }),
    /* @__PURE__ */ jsxs(SettingsLayout, { children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4", children: [
          /* @__PURE__ */ jsx(HeadingSmall, { title: t("platform.teams.title"), description: t("platform.teams.subtitle") }),
          /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => openCreate(null), children: [
            /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
            t("platform.teams.add")
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "rounded-xl border p-1", children: tree.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground p-4 text-sm", children: t("platform.teams.empty") }) : tree.map((node) => /* @__PURE__ */ jsx(
          TeamNode,
          {
            node,
            depth: 0,
            onAddChild: openCreate,
            onRename: openRename,
            onMove: openMove,
            onDelete: setDeleteTarget
          },
          node.id
        )) })
      ] }),
      /* @__PURE__ */ jsx(Dialog, { open: dialog !== null, onOpenChange: (open) => !open && setDialog(null), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: dialogTitle }) }),
        (dialog == null ? void 0 : dialog.mode) === "reparent" ? /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { children: t("platform.teams.parent") }),
          /* @__PURE__ */ jsxs(Select, { value: parentId ?? "root", onValueChange: (value) => setParentId(value === "root" ? null : value), children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "root", children: t("platform.teams.no_parent") }),
              teams.filter((team) => {
                var _a;
                return team.id !== ((_a = dialog == null ? void 0 : dialog.team) == null ? void 0 : _a.id);
              }).map((team) => /* @__PURE__ */ jsx(SelectItem, { value: team.id, children: team.name }, team.id))
            ] })
          ] })
        ] }) : /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "team-name", children: t("platform.teams.name") }),
          /* @__PURE__ */ jsx(Input, { id: "team-name", value: name, onChange: (e) => setName(e.target.value), autoFocus: true })
        ] }),
        /* @__PURE__ */ jsx(InputError, { message: error }),
        /* @__PURE__ */ jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setDialog(null), children: t("platform.actions.cancel") }),
          /* @__PURE__ */ jsx(Button, { onClick: submit, children: t("platform.actions.save") })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Dialog, { open: deleteTarget !== null, onOpenChange: (open) => !open && setDeleteTarget(null), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxs(DialogHeader, { children: [
          /* @__PURE__ */ jsx(DialogTitle, { children: t("platform.actions.delete") }),
          /* @__PURE__ */ jsx(DialogDescription, { children: t("platform.teams.delete_confirm") })
        ] }),
        /* @__PURE__ */ jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setDeleteTarget(null), children: t("platform.actions.cancel") }),
          /* @__PURE__ */ jsx(Button, { variant: "destructive", onClick: confirmDelete, children: t("platform.actions.delete") })
        ] })
      ] }) })
    ] })
  ] });
}
const __vite_glob_0_59 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: TeamsSettings
}, Symbol.toStringTag, { value: "Module" }));
function WorkspaceSettings({ workspace, options }) {
  const t = useTranslator();
  const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({ ...workspace });
  const submit = (e) => {
    e.preventDefault();
    patch(route("workspace.update"), { preserveScroll: true });
  };
  const breadcrumbs2 = [{ title: t("platform.workspace.settings_title"), href: "/settings/workspace" }];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs: breadcrumbs2, children: [
    /* @__PURE__ */ jsx(Head, { title: t("platform.workspace.settings_title") }),
    /* @__PURE__ */ jsx(SettingsLayout, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsx(HeadingSmall, { title: t("platform.workspace.settings_title"), description: t("platform.workspace.settings_subtitle") }),
      /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "name", children: t("platform.workspace.name") }),
          /* @__PURE__ */ jsx(Input, { id: "name", value: data.name, onChange: (e) => setData("name", e.target.value), required: true }),
          /* @__PURE__ */ jsx(InputError, { message: errors.name })
        ] }),
        /* @__PURE__ */ jsx(
          SelectField,
          {
            label: t("platform.workspace.base_currency"),
            value: data.base_currency,
            onValueChange: (value) => setData("base_currency", value),
            options: options.currencies,
            error: errors.base_currency
          }
        ),
        /* @__PURE__ */ jsx(
          SelectField,
          {
            label: t("platform.workspace.timezone"),
            value: data.timezone,
            onValueChange: (value) => setData("timezone", value),
            options: options.timezones,
            error: errors.timezone
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { children: t("platform.workspace.locale") }),
          /* @__PURE__ */ jsxs(Select, { value: data.locale, onValueChange: (value) => setData("locale", value), children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsx(SelectContent, { children: options.locales.map((code) => /* @__PURE__ */ jsx(SelectItem, { value: code, children: t(`platform.locale.${code}`) }, code)) })
          ] }),
          /* @__PURE__ */ jsx(InputError, { message: errors.locale })
        ] }),
        /* @__PURE__ */ jsx(
          SelectField,
          {
            label: t("platform.workspace.audit_retention"),
            value: data.audit_retention,
            onValueChange: (value) => setData("audit_retention", value),
            options: options.retentions,
            error: errors.audit_retention
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx(Button, { disabled: processing, children: t("platform.actions.save") }),
          /* @__PURE__ */ jsx(
            Transition,
            {
              show: recentlySuccessful,
              enter: "transition ease-in-out",
              enterFrom: "opacity-0",
              leave: "transition ease-in-out",
              leaveTo: "opacity-0",
              children: /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: t("platform.workspace.saved") })
            }
          )
        ] })
      ] })
    ] }) })
  ] });
}
function SelectField({
  label,
  value,
  onValueChange,
  options,
  error
}) {
  return /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
    /* @__PURE__ */ jsx(Label, { children: label }),
    /* @__PURE__ */ jsxs(Select, { value, onValueChange, children: [
      /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
      /* @__PURE__ */ jsx(SelectContent, { children: options.map((option) => /* @__PURE__ */ jsx(SelectItem, { value: option, children: option }, option)) })
    ] }),
    /* @__PURE__ */ jsx(InputError, { message: error })
  ] });
}
const __vite_glob_0_60 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: WorkspaceSettings
}, Symbol.toStringTag, { value: "Module" }));
const FEATURES = [
  { key: "inbox", icon: MessagesSquare },
  { key: "crm", icon: UserPlus },
  { key: "automation", icon: Zap },
  { key: "teams", icon: ShieldCheck }
];
function LandingFeatures() {
  const t = useTranslator();
  return /* @__PURE__ */ jsxs("section", { id: "features", className: "mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-2xl text-center", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-3xl font-semibold tracking-tight text-balance sm:text-4xl", children: t("platform.landing.features.title") }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-4 text-lg text-pretty", children: t("platform.landing.features.subtitle") })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4", children: FEATURES.map(({ key, icon: Icon }) => /* @__PURE__ */ jsxs("div", { className: "bg-card rounded-shell border-border/70 border p-6 shadow-sm transition-shadow hover:shadow-md", children: [
      /* @__PURE__ */ jsx("span", { className: "bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-xl", children: /* @__PURE__ */ jsx(Icon, { className: "size-5" }) }),
      /* @__PURE__ */ jsx("h3", { className: "mt-5 text-lg font-semibold", children: t(`platform.landing.features.${key}.title`) }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-2 text-sm leading-relaxed", children: t(`platform.landing.features.${key}.description`) })
    ] }, key)) })
  ] });
}
const BRAND$1 = "Yona";
function LandingFooter() {
  const t = useTranslator();
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  return /* @__PURE__ */ jsx("footer", { className: "border-border/60 border-t", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5", children: [
      /* @__PURE__ */ jsx("span", { className: "bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg", children: /* @__PURE__ */ jsx(AppLogoIcon, { className: "size-5 fill-current text-white dark:text-black" }) }),
      /* @__PURE__ */ jsx("span", { className: "font-semibold tracking-tight", children: BRAND$1 })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: t("platform.landing.footer.tagline") }),
    /* @__PURE__ */ jsx("p", { className: "text-muted-foreground/80 text-sm", children: t("platform.landing.footer.copyright", { year }) })
  ] }) });
}
const OPTIONS = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor }
];
function AppearanceToggleDropdown({ className }) {
  const { appearance, updateAppearance } = useAppearance();
  const t = useTranslator();
  const ActiveIcon = (OPTIONS.find((option) => option.value === appearance) ?? OPTIONS[2]).icon;
  return /* @__PURE__ */ jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: cn("size-9 rounded-full", className), "aria-label": t("platform.nav.appearance"), children: /* @__PURE__ */ jsx(ActiveIcon, { className: "size-4" }) }) }),
    /* @__PURE__ */ jsx(DropdownMenuContent, { align: "end", className: "min-w-36", children: OPTIONS.map(({ value, icon: Icon }) => /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => updateAppearance(value), className: "gap-2", children: [
      /* @__PURE__ */ jsx(Icon, { className: "size-4" }),
      /* @__PURE__ */ jsx("span", { className: "flex-1", children: t(`platform.appearance.${value}`) }),
      appearance === value && /* @__PURE__ */ jsx(Check, { className: "size-4" })
    ] }, value)) })
  ] });
}
const BRAND = "Yona";
function LandingHeader() {
  const { auth } = usePage().props;
  const t = useTranslator();
  return (
    // Floating "island" header (design-system §5 shell radius): a contained pill that floats over the hero.
    /* @__PURE__ */ jsx("header", { className: "fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:pt-4", children: /* @__PURE__ */ jsxs("div", { className: "rounded-shell border-border/60 bg-card/70 mx-auto flex h-16 w-full max-w-5xl items-center justify-between border px-4 shadow-lg shadow-black/5 backdrop-blur-md sm:px-6", children: [
      /* @__PURE__ */ jsxs(Link, { href: route("home"), className: "flex items-center gap-2.5", children: [
        /* @__PURE__ */ jsx("span", { className: "bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg", children: /* @__PURE__ */ jsx(AppLogoIcon, { className: "size-5 fill-current text-white dark:text-black" }) }),
        /* @__PURE__ */ jsx("span", { className: "text-base font-semibold tracking-tight", children: BRAND })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 sm:gap-3", children: [
        /* @__PURE__ */ jsx(
          "a",
          {
            href: "#features",
            className: "text-muted-foreground hover:text-foreground hidden text-sm font-medium transition-colors sm:inline-block",
            children: t("platform.landing.nav.features")
          }
        ),
        /* @__PURE__ */ jsx(AppearanceToggleDropdown, { className: "hidden sm:inline-flex" }),
        auth.user ? /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", className: "h-11 sm:h-9", children: /* @__PURE__ */ jsxs(Link, { href: route("dashboard"), children: [
          t("platform.landing.nav.dashboard"),
          /* @__PURE__ */ jsx(ArrowRight, {})
        ] }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Button, { asChild: true, variant: "ghost", size: "sm", className: "hidden sm:inline-flex", children: /* @__PURE__ */ jsx(Link, { href: route("login"), children: t("platform.landing.nav.login") }) }),
          /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", className: "h-11 sm:h-9", children: /* @__PURE__ */ jsx(Link, { href: route("register"), children: t("platform.landing.nav.register") }) })
        ] })
      ] })
    ] }) })
  );
}
const TWO_PI = Math.PI * 2;
const MAX_DPR = 2;
const DotField = memo(function DotField2({
  dotRadius = 1.5,
  dotSpacing = 14,
  cursorRadius = 500,
  cursorForce = 0.1,
  bulgeOnly = true,
  bulgeStrength = 67,
  glowRadius = 160,
  sparkle = false,
  waveAmplitude = 0,
  gradientFrom = "rgba(168, 85, 247, 0.35)",
  gradientTo = "rgba(180, 151, 207, 0.25)",
  glowColor = "#120F17",
  ...rest
}) {
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const glowRef = useRef(null);
  const dotsRef = useRef([]);
  const mouseRef = useRef({ x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 });
  const rafRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0, offsetX: 0, offsetY: 0 });
  const glowOpacity = useRef(0);
  const engagement = useRef(0);
  const propsRef = useRef({
    dotRadius,
    dotSpacing,
    cursorRadius,
    cursorForce,
    bulgeOnly,
    bulgeStrength,
    sparkle,
    waveAmplitude,
    gradientFrom,
    gradientTo
  });
  propsRef.current = {
    dotRadius,
    dotSpacing,
    cursorRadius,
    cursorForce,
    bulgeOnly,
    bulgeStrength,
    sparkle,
    waveAmplitude,
    gradientFrom,
    gradientTo
  };
  const rebuildRef = useRef(null);
  const glowIdRef = useRef(`dot-field-glow-${Math.random().toString(36).slice(2, 9)}`);
  useEffect(() => {
    const rawCanvas = canvasRef.current;
    const glowEl = glowRef.current;
    if (!rawCanvas) return;
    const rawCtx = rawCanvas.getContext("2d", { alpha: true });
    if (!rawCtx) return;
    const canvas = rawCanvas;
    const ctx = rawCtx;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    let resizeTimer;
    function resize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(doResize, 100);
    }
    function doResize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = {
        w,
        h,
        offsetX: rect.left + window.scrollX,
        offsetY: rect.top + window.scrollY
      };
      buildDots(w, h);
      if (prefersReduced) paintStatic();
    }
    function buildDots(w, h) {
      const p = propsRef.current;
      const step = p.dotRadius + p.dotSpacing;
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);
      const padX = w % step / 2;
      const padY = h % step / 2;
      const dots = new Array(rows * cols);
      let idx = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const ax = padX + col * step + step / 2;
          const ay = padY + row * step + step / 2;
          dots[idx++] = { ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay };
        }
      }
      dotsRef.current = dots;
    }
    function paintStatic() {
      const dots = dotsRef.current;
      const { w, h } = sizeRef.current;
      const p = propsRef.current;
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, p.gradientFrom);
      grad.addColorStop(1, p.gradientTo);
      ctx.fillStyle = grad;
      const rad = p.dotRadius / 2;
      ctx.beginPath();
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        ctx.moveTo(d.ax + rad, d.ay);
        ctx.arc(d.ax, d.ay, rad, 0, TWO_PI);
      }
      ctx.fill();
    }
    function onMouseMove(e) {
      const s = sizeRef.current;
      mouseRef.current.x = e.pageX - s.offsetX;
      mouseRef.current.y = e.pageY - s.offsetY;
    }
    function updateMouseSpeed() {
      const m = mouseRef.current;
      const dx = m.prevX - m.x;
      const dy = m.prevY - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      m.speed += (dist - m.speed) * 0.5;
      if (m.speed < 1e-3) m.speed = 0;
      m.prevX = m.x;
      m.prevY = m.y;
    }
    let frameCount = 0;
    function tick() {
      frameCount++;
      const dots = dotsRef.current;
      const m = mouseRef.current;
      const { w, h } = sizeRef.current;
      const p = propsRef.current;
      const len = dots.length;
      const t = frameCount * 0.02;
      const targetEngagement = Math.min(m.speed / 5, 1);
      engagement.current += (targetEngagement - engagement.current) * 0.06;
      if (engagement.current < 1e-3) engagement.current = 0;
      const eng = engagement.current;
      glowOpacity.current += (eng - glowOpacity.current) * 0.08;
      if (glowEl) {
        glowEl.setAttribute("cx", String(m.x));
        glowEl.setAttribute("cy", String(m.y));
        glowEl.style.opacity = String(glowOpacity.current);
      }
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, p.gradientFrom);
      grad.addColorStop(1, p.gradientTo);
      ctx.fillStyle = grad;
      const cr = p.cursorRadius;
      const crSq = cr * cr;
      const rad = p.dotRadius / 2;
      const isBulge = p.bulgeOnly;
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const d = dots[i];
        const dx = m.x - d.ax;
        const dy = m.y - d.ay;
        const distSq = dx * dx + dy * dy;
        if (distSq < crSq && eng > 0.01) {
          const dist = Math.sqrt(distSq);
          if (isBulge) {
            const tt = 1 - dist / cr;
            const push = tt * tt * p.bulgeStrength * eng;
            const angle = Math.atan2(dy, dx);
            d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
            d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
          } else {
            const angle = Math.atan2(dy, dx);
            const move = 500 / dist * (m.speed * p.cursorForce);
            d.vx += Math.cos(angle) * -move;
            d.vy += Math.sin(angle) * -move;
          }
        } else if (isBulge) {
          d.sx += (d.ax - d.sx) * 0.1;
          d.sy += (d.ay - d.sy) * 0.1;
        }
        if (!isBulge) {
          d.vx *= 0.9;
          d.vy *= 0.9;
          d.x = d.ax + d.vx;
          d.y = d.ay + d.vy;
          d.sx += (d.x - d.sx) * 0.1;
          d.sy += (d.y - d.sy) * 0.1;
        }
        let drawX = d.sx;
        let drawY = d.sy;
        if (p.waveAmplitude > 0) {
          drawY += Math.sin(d.ax * 0.03 + t) * p.waveAmplitude;
          drawX += Math.cos(d.ay * 0.03 + t * 0.7) * p.waveAmplitude * 0.5;
        }
        if (p.sparkle) {
          const hash = (i * 2654435761 ^ frameCount >> 3) >>> 0;
          if (hash % 100 < 3) {
            ctx.moveTo(drawX + rad * 1.8, drawY);
            ctx.arc(drawX, drawY, rad * 1.8, 0, TWO_PI);
          } else {
            ctx.moveTo(drawX + rad, drawY);
            ctx.arc(drawX, drawY, rad, 0, TWO_PI);
          }
        } else {
          ctx.moveTo(drawX + rad, drawY);
          ctx.arc(drawX, drawY, rad, 0, TWO_PI);
        }
      }
      ctx.fill();
      rafRef.current = requestAnimationFrame(tick);
    }
    doResize();
    window.addEventListener("resize", resize);
    rebuildRef.current = () => {
      const { w, h } = sizeRef.current;
      if (w > 0 && h > 0) {
        buildDots(w, h);
        if (prefersReduced) paintStatic();
      }
    };
    if (prefersReduced) {
      return () => {
        clearTimeout(resizeTimer);
        window.removeEventListener("resize", resize);
      };
    }
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    const speedInterval = setInterval(updateMouseSpeed, 20);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearInterval(speedInterval);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);
  useEffect(() => {
    var _a;
    (_a = rebuildRef.current) == null ? void 0 : _a.call(rebuildRef);
  }, [dotRadius, dotSpacing]);
  return /* @__PURE__ */ jsxs("div", { className: "dot-field-container", ...rest, children: [
    /* @__PURE__ */ jsx("canvas", { ref: canvasRef, className: "absolute inset-0 h-full w-full" }),
    /* @__PURE__ */ jsxs("svg", { ref: svgRef, className: "pointer-events-none absolute inset-0 h-full w-full", children: [
      /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("radialGradient", { id: glowIdRef.current, children: [
        /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: glowColor }),
        /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "transparent" })
      ] }) }),
      /* @__PURE__ */ jsx(
        "circle",
        {
          ref: glowRef,
          cx: "-9999",
          cy: "-9999",
          r: glowRadius,
          fill: `url(#${glowIdRef.current})`,
          className: "opacity-0 [will-change:opacity]"
        }
      )
    ] })
  ] });
});
DotField.displayName = "DotField";
const hasDarkClass = () => typeof document !== "undefined" && document.documentElement.classList.contains("dark");
function useIsDark() {
  const [dark, setDark] = useState(hasDarkClass);
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(hasDarkClass()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    setDark(hasDarkClass());
    return () => observer.disconnect();
  }, []);
  return dark;
}
const DOTS_LIGHT = { gradientFrom: "rgba(67, 56, 202, 0.60)", gradientTo: "rgba(147, 51, 234, 0.45)", glowColor: "rgba(129, 140, 248, 0.55)" };
const DOTS_DARK = { gradientFrom: "rgba(165, 180, 252, 0.55)", gradientTo: "rgba(196, 181, 253, 0.32)", glowColor: "#4f46e5" };
function LandingHero() {
  const { auth } = usePage().props;
  const t = useTranslator();
  const dots = useIsDark() ? DOTS_DARK : DOTS_LIGHT;
  return /* @__PURE__ */ jsxs("section", { className: "relative isolate flex min-h-[640px] items-center overflow-hidden lg:min-h-[86vh]", children: [
    /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-0 -z-10", children: /* @__PURE__ */ jsx(DotField, { dotRadius: 4, dotSpacing: 18, bulgeStrength: 80, glowRadius: 200, ...dots }) }),
    /* @__PURE__ */ jsx("div", { className: "to-canvas pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent" }),
    /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(ellipse_55%_45%_at_50%_45%,var(--canvas)_0%,transparent_70%)]" }),
    /* @__PURE__ */ jsxs("div", { className: "mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6", children: [
      /* @__PURE__ */ jsx("span", { className: "border-border/70 bg-card/60 text-muted-foreground inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium backdrop-blur-sm", children: t("platform.landing.hero.eyebrow") }),
      /* @__PURE__ */ jsx("h1", { className: "mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl", children: t("platform.landing.hero.title") }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mx-auto mt-6 max-w-2xl text-lg text-pretty", children: t("platform.landing.hero.subtitle") }),
      /* @__PURE__ */ jsx("div", { className: "mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row", children: auth.user ? /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", children: /* @__PURE__ */ jsxs(Link, { href: route("dashboard"), children: [
        t("platform.landing.hero.cta_dashboard"),
        /* @__PURE__ */ jsx(ArrowRight, {})
      ] }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", children: /* @__PURE__ */ jsxs(Link, { href: route("register"), children: [
          t("platform.landing.hero.cta_primary"),
          /* @__PURE__ */ jsx(ArrowRight, {})
        ] }) }),
        /* @__PURE__ */ jsx(Button, { asChild: true, variant: "outline", size: "lg", children: /* @__PURE__ */ jsx(Link, { href: route("login"), children: t("platform.landing.hero.cta_secondary") }) })
      ] }) }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-5 text-sm", children: t("platform.landing.hero.hint") })
    ] })
  ] });
}
function Welcome() {
  const t = useTranslator();
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(Head, { title: t("platform.landing.hero.eyebrow"), children: [
      /* @__PURE__ */ jsx("link", { rel: "preconnect", href: "https://fonts.bunny.net" }),
      /* @__PURE__ */ jsx("link", { href: "https://fonts.bunny.net/css?family=inter:400,500,600,700", rel: "stylesheet" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-canvas text-foreground flex min-h-screen flex-col", children: [
      /* @__PURE__ */ jsx(LandingHeader, {}),
      /* @__PURE__ */ jsxs("main", { className: "flex-1", children: [
        /* @__PURE__ */ jsx(LandingHero, {}),
        /* @__PURE__ */ jsx(LandingFeatures, {})
      ] }),
      /* @__PURE__ */ jsx(LandingFooter, {})
    ] })
  ] });
}
const __vite_glob_0_61 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Welcome
}, Symbol.toStringTag, { value: "Module" }));
const appPages = /* @__PURE__ */ Object.assign({ "./pages/admin/auth/forgot-password.tsx": __vite_glob_0_0, "./pages/admin/auth/login.tsx": __vite_glob_0_1, "./pages/admin/auth/reset-password.tsx": __vite_glob_0_2, "./pages/admin/dashboard.tsx": __vite_glob_0_3, "./pages/admin/workspaces/index.tsx": __vite_glob_0_4, "./pages/admin/workspaces/show.tsx": __vite_glob_0_5, "./pages/announcements/admin/create.tsx": __vite_glob_0_6, "./pages/announcements/admin/edit.tsx": __vite_glob_0_7, "./pages/announcements/admin/index.tsx": __vite_glob_0_8, "./pages/announcements/index.tsx": __vite_glob_0_9, "./pages/auth/confirm-password.tsx": __vite_glob_0_10, "./pages/auth/forgot-password.tsx": __vite_glob_0_11, "./pages/auth/login.tsx": __vite_glob_0_12, "./pages/auth/register.tsx": __vite_glob_0_13, "./pages/auth/reset-password.tsx": __vite_glob_0_14, "./pages/auth/verify-email.tsx": __vite_glob_0_15, "./pages/automation/create.tsx": __vite_glob_0_16, "./pages/automation/index.tsx": __vite_glob_0_17, "./pages/automation/show.tsx": __vite_glob_0_18, "./pages/billing/workspace-plans/index.tsx": __vite_glob_0_19, "./pages/crm/clients/create.tsx": __vite_glob_0_20, "./pages/crm/clients/edit.tsx": __vite_glob_0_21, "./pages/crm/clients/groups.tsx": __vite_glob_0_22, "./pages/crm/clients/index.tsx": __vite_glob_0_23, "./pages/crm/clients/show.tsx": __vite_glob_0_24, "./pages/crm/leads/components/lead-assign-popover.tsx": __vite_glob_0_25, "./pages/crm/leads/components/lead-card.tsx": __vite_glob_0_26, "./pages/crm/leads/components/lead-convert-dialog.tsx": __vite_glob_0_27, "./pages/crm/leads/components/lead-form.tsx": __vite_glob_0_28, "./pages/crm/leads/create.tsx": __vite_glob_0_29, "./pages/crm/leads/edit.tsx": __vite_glob_0_30, "./pages/crm/leads/index.tsx": __vite_glob_0_31, "./pages/crm/leads/kanban.tsx": __vite_glob_0_32, "./pages/crm/leads/show.tsx": __vite_glob_0_33, "./pages/dashboard.tsx": __vite_glob_0_34, "./pages/email/email-templates/edit.tsx": __vite_glob_0_35, "./pages/email/email-templates/index.tsx": __vite_glob_0_36, "./pages/inbox/index.tsx": __vite_glob_0_37, "./pages/integration/components/integration-card.tsx": __vite_glob_0_38, "./pages/integration/index.tsx": __vite_glob_0_39, "./pages/integration/zalo/index.tsx": __vite_glob_0_40, "./pages/notifications/index.tsx": __vite_glob_0_41, "./pages/projects/create.tsx": __vite_glob_0_42, "./pages/projects/edit.tsx": __vite_glob_0_43, "./pages/projects/index.tsx": __vite_glob_0_44, "./pages/projects/show.tsx": __vite_glob_0_45, "./pages/projects/tasks/index.tsx": __vite_glob_0_46, "./pages/projects/tasks/kanban.tsx": __vite_glob_0_47, "./pages/projects/tasks/show.tsx": __vite_glob_0_48, "./pages/settings/appearance.tsx": __vite_glob_0_49, "./pages/settings/custom-fields/index.tsx": __vite_glob_0_50, "./pages/settings/lookups/_lookup-table.tsx": __vite_glob_0_51, "./pages/settings/lookups/_stage-list.tsx": __vite_glob_0_52, "./pages/settings/lookups/lead-sources.tsx": __vite_glob_0_53, "./pages/settings/lookups/pipelines.tsx": __vite_glob_0_54, "./pages/settings/lookups/project-statuses.tsx": __vite_glob_0_55, "./pages/settings/members.tsx": __vite_glob_0_56, "./pages/settings/password.tsx": __vite_glob_0_57, "./pages/settings/profile.tsx": __vite_glob_0_58, "./pages/settings/teams.tsx": __vite_glob_0_59, "./pages/settings/workspace.tsx": __vite_glob_0_60, "./pages/welcome.tsx": __vite_glob_0_61 });
function resolvePage(name) {
  return appPages[`./pages/${name}.tsx`];
}
createServer(
  (page) => createInertiaApp({
    page,
    render: ReactDOMServer.renderToString,
    resolve: resolvePage,
    // prettier-ignore
    setup: ({ App, props }) => /* @__PURE__ */ jsx(App, { ...props })
  })
);
