import { createIcons } from '@solar-icons/js';
import { HomeLinearIcon } from '@solar-icons/js/linear/home';
import { UsersGroupRoundedLinearIcon } from '@solar-icons/js/linear/users-group-rounded';
import { CalendarLinearIcon } from '@solar-icons/js/linear/calendar';
import { FileTextLinearIcon } from '@solar-icons/js/linear/file-text';
import { ClockCircleLinearIcon } from '@solar-icons/js/linear/clock-circle';
import { Routing2LinearIcon } from '@solar-icons/js/linear/routing-2';
import { MapLinearIcon } from '@solar-icons/js/linear/map';
import { MagnifierLinearIcon } from '@solar-icons/js/linear/magnifier';
import { AddLinearIcon } from '@solar-icons/js/linear/add';
import { ArrowRightLinearIcon } from '@solar-icons/js/linear/arrow-right';
import { CheckLinearIcon } from '@solar-icons/js/linear/check';
import { HeartLinearIcon } from '@solar-icons/js/linear/heart';
import { StarLinearIcon } from '@solar-icons/js/linear/star';
import { DangerCircleLinearIcon } from '@solar-icons/js/linear/danger-circle';
import { Pulse2LinearIcon } from '@solar-icons/js/linear/pulse-2';
import { ShieldCheckLinearIcon } from '@solar-icons/js/linear/shield-check';
import { BellLinearIcon } from '@solar-icons/js/linear/bell';
import { LayersLinearIcon } from '@solar-icons/js/linear/layers';
import { LetterLinearIcon } from '@solar-icons/js/linear/letter';
import { Widget4LinearIcon } from '@solar-icons/js/linear/widget-4';

declare global {
  interface Window { OCD_SOLAR_REFRESH?: () => void; }
}

const icons = {
  HomeLinearIcon, UsersGroupRoundedLinearIcon, CalendarLinearIcon, FileTextLinearIcon,
  ClockCircleLinearIcon, Routing2LinearIcon, MapLinearIcon, MagnifierLinearIcon,
  AddLinearIcon, ArrowRightLinearIcon, CheckLinearIcon, HeartLinearIcon, StarLinearIcon,
  DangerCircleLinearIcon, Pulse2LinearIcon, ShieldCheckLinearIcon, BellLinearIcon,
  LayersLinearIcon, LetterLinearIcon, Widget4LinearIcon,
};

export function refreshSolarIcons() {
  createIcons({ icons });
}

window.OCD_SOLAR_REFRESH = refreshSolarIcons;
