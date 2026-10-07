// Reference demo for team-section.tsx (not compiled or served here).

import React from "react";
import { TeamSection } from "@/components/ui/team-section";
import { Twitter, Facebook, Instagram, Youtube, Github, Linkedin } from "lucide-react";

export default function TeamSectionDemo() {
  const teamMembers = [
    {
      name: "EMMA",
      designation: "Product Designer",
      imageSrc: "https://cdn.21st.dev/assets/mirror/e8/e87dd9c3d7e7c987901cef2bcca30db0157a1b51824e8628ccbfb27637ab9902.jpg",
      socialLinks: [
        { icon: Twitter, href: "#" },
        { icon: Linkedin, href: "#" },
      ],
    },
    {
      name: "HENRY",
      designation: "Lead Developer",
      imageSrc: "https://cdn.21st.dev/assets/mirror/99/9962a124f42fc85ab70e0ffc89c7b61b9851ecea9aaeba8168a53824a2d74cad.jpg",
      socialLinks: [
        { icon: Github, href: "#" },
        { icon: Twitter, href: "#" },
      ],
    },
    {
      name: "JOHN",
      designation: "Marketing Specialist",
      imageSrc: "https://cdn.21st.dev/assets/mirror/ee/eec32305a7a6a9464effe3b43b1eb474d84c03fdd0fe8bc8e2c8f596dca65f98.jpg",
      socialLinks: [
        { icon: Facebook, href: "#" },
        { icon: Instagram, href: "#" },
      ],
    },
  ];

  const mainSocialLinks = [
    { icon: Twitter, href: "#" },
    { icon: Facebook, href: "#" },
    { icon: Instagram, href: "#" },
    { icon: Youtube, href: "#" },
  ];

  return (
    <TeamSection
      title="CREATIVE TEAM"
      description="Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat."
      members={teamMembers}
      registerLink="#"
      logo="RAVI"
      socialLinksMain={mainSocialLinks}
    />
  );
}
