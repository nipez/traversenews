import type { LocalGroup, UsefulLocalLink } from "@/lib/useful-local";

/**
 * Outbound Useful local — official directories only.
 * Do not invent hours or listings.
 */
export const ANN_ARBOR_LOCAL_GROUPS: readonly LocalGroup[] = [
  {
    id: "going-out",
    title: "Going out",
    links: [
      {
        href: "https://aadl.org/",
        label: "AADL",
        dek: "Ann Arbor District Library",
      },
      {
        href: "https://www.theride.org/",
        label: "TheRide",
        dek: "Ann Arbor Area bus",
      },
    ],
  },
  {
    id: "civic",
    title: "Civic",
    links: [
      {
        href: "https://www.a2gov.org/",
        label: "City of Ann Arbor",
        dek: "Official city site",
      },
      {
        href: "https://www.washtenaw.org/",
        label: "Washtenaw County",
        dek: "County offices and services",
      },
    ],
  },
  {
    id: "also",
    title: "Also",
    links: [
      {
        href: "https://www.a2schools.org/",
        label: "AAPS",
        dek: "Ann Arbor Public Schools",
      },
      {
        href: "https://www.dcsd.org/",
        label: "Dexter Schools",
        dek: "Dexter Community Schools",
      },
    ],
  },
];

export const ANN_ARBOR_GOING_OUT: readonly UsefulLocalLink[] =
  ANN_ARBOR_LOCAL_GROUPS[0].links;
