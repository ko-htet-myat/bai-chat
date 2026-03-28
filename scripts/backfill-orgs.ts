import { prisma } from "../src/lib/db";

async function main() {
  const users = await prisma.user.findMany({
    include: {
      organizationMembers: true,
    },
  });

  for (const user of users) {
    if (user.organizationMembers.length === 0) {
      console.log("Creating org for", user.email);
      const org = await prisma.organization.create({
        data: {
          name: `${user.name}'s Workspace`,
          slug: `workspace-${user.id}`,
        },
      });

      await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: "owner",
        },
      });
    }
  }
  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
