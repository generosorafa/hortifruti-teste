import { readFile } from "node:fs/promises";
import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

let environment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-zeca-hortifruti",
    firestore: { rules: await readFile("firestore.rules", "utf8") },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const admin = context.firestore();
    await setDoc(doc(admin, "authorizedUsers", "allowed-user"), {
      email: "operador@gmail.com",
      active: true,
      role: "admin",
    });
    await setDoc(doc(admin, "authorizedUsers", "inactive-user"), {
      email: "inativo@gmail.com",
      active: false,
      role: "operator",
    });
    await setDoc(doc(admin, "clients", "cliente-1"), { name: "Cliente Teste" });
  });
});

after(async () => {
  await environment.cleanup();
});

test("nega leitura para visitante sem login", async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDocs(collection(db, "clients")));
});

test("nega conta Google autenticada que não está autorizada", async () => {
  const db = environment.authenticatedContext("unknown-user", {
    email: "desconhecido@gmail.com",
    email_verified: true,
  }).firestore();
  await assertFails(getDocs(collection(db, "clients")));
});

test("permite leitura e escrita para usuário ativo e e-mail correspondente", async () => {
  const db = environment.authenticatedContext("allowed-user", {
    email: "operador@gmail.com",
    email_verified: true,
  }).firestore();
  await assertSucceeds(getDocs(collection(db, "clients")));
  await assertSucceeds(setDoc(doc(db, "orders", "1050"), { number: "#1050" }));
  await assertSucceeds(setDoc(doc(db, "companySettings", "company"), { tradeName: "Zeca Hortifruti" }));
});

test("nega usuário inativo e autorização com e-mail divergente", async () => {
  const inactive = environment.authenticatedContext("inactive-user", {
    email: "inativo@gmail.com",
    email_verified: true,
  }).firestore();
  const mismatched = environment.authenticatedContext("allowed-user", {
    email: "outro@gmail.com",
    email_verified: true,
  }).firestore();
  await assertFails(getDocs(collection(inactive, "products")));
  await assertFails(getDocs(collection(mismatched, "products")));
});

test("usuário consulta somente sua própria autorização e não consegue alterá-la", async () => {
  const db = environment.authenticatedContext("allowed-user", {
    email: "operador@gmail.com",
    email_verified: true,
  }).firestore();
  await assertSucceeds(getDoc(doc(db, "authorizedUsers", "allowed-user")));
  await assertFails(getDoc(doc(db, "authorizedUsers", "inactive-user")));
  await assertFails(setDoc(doc(db, "authorizedUsers", "allowed-user"), { active: false }));
});

test("nega coleções não previstas mesmo para usuário autorizado", async () => {
  const db = environment.authenticatedContext("allowed-user", {
    email: "operador@gmail.com",
    email_verified: true,
  }).firestore();
  await assertFails(setDoc(doc(db, "privateConfiguration", "secret"), { value: true }));
});

test("confirma que o documento de teste existe antes das asserções", async () => {
  const db = environment.authenticatedContext("allowed-user", {
    email: "operador@gmail.com",
    email_verified: true,
  }).firestore();
  const snapshot = await assertSucceeds(getDoc(doc(db, "clients", "cliente-1")));
  assert.equal(snapshot.data().name, "Cliente Teste");
});
