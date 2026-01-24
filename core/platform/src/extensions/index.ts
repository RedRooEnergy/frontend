import { registerExtension } from "./extensions-registry";
import {
  EXTENSION_ID,
  registerSupplierOnboarding
} from "../../../../extensions/supplier-onboarding/src";

registerExtension({
  id: EXTENSION_ID,
  register: registerSupplierOnboarding
});
