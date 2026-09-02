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
      {
        href: "https://www.ypsilibrary.org/",
        label: "YDL",
        dek: "Ypsilanti District Library",
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
        href: "https://www.cityofypsilanti.com/",
        label: "City of Ypsilanti",
        dek: "Official city site",
      },
      {
        href: "https://www.salinemi.gov/",
        label: "City of Saline",
        dek: "Official city site",
      },
      {
        href: "https://www.city-chelsea.org/",
        label: "City of Chelsea",
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
        href: "https://www.ycschools.us/",
        label: "YCS",
        dek: "Ypsilanti Community Schools",
      },
      {
        href: "https://www.salineschools.org/",
        label: "Saline Schools",
        dek: "Saline Area Schools",
      },
      {
        href: "https://www.chelseaschools.org/",
        label: "Chelsea Schools",
        dek: "Chelsea School District",
      },
      {
        href: "https://www.dexterschools.org/",
        label: "Dexter Schools",
        dek: "Dexter Community Schools",
      },
    ],
  },
];

export const ANN_ARBOR_GOING_OUT: readonly UsefulLocalLink[] =
  ANN_ARBOR_LOCAL_GROUPS[0].links;
