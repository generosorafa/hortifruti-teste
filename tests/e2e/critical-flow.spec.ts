import { expect, test } from "@playwright/test";

test("abre o painel demonstrativo e navega para produtos", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Fluxo de navegação da versão desktop");

  await page.goto("#/inicio");
  await expect(page.getByRole("heading", { name: "Visão geral da operação" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Ambiente demonstrativo");

  await page.getByRole("button", { name: "Produtos", exact: true }).click();
  await expect(page).toHaveURL(/#\/produtos$/);
  await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();
});

test("mantém o fluxo principal acessível no celular", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Fluxo da navegação móvel");

  await page.goto("#/inicio");
  await expect(page.getByRole("heading", { name: "Visão geral da operação" })).toBeVisible();

  await page.locator(".mobile-create").click();
  await expect(page).toHaveURL(/#\/novo-pedido$/);
  await expect(page.getByRole("heading", { name: "Incluir pedido" })).toBeVisible();
  await expect(page.getByLabel("Ajuste do valor total do pedido")).toBeVisible();
});
