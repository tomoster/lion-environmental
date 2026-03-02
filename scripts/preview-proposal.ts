import { generateXRFProposal } from "../src/lib/proposals/generate";
import fs from "fs";

async function main() {
  const data = {
    building_address: "123 Main St, Brooklyn, NY 11201",
    num_units: 10,
    has_xrf: true, has_dust_swab: false, has_asbestos: false,
    num_studios_1bed: 6, xrf_price_studios_1bed: 170,
    num_2_3bed: 4, xrf_price_2_3bed: 200,
    num_common_spaces: 2, xrf_price_per_common_space: 250,
    num_wipes: null, wipe_rate: null,
    dust_swab_site_visit_rate: null, dust_swab_proj_mgmt_rate: null,
    num_asbestos_samples: null, asbestos_sample_rate: null, asbestos_site_visit_rate: null,
  };

  const jobInfo = {
    job_number: 500,
    client_company: "Interia Management LLC",
  };

  const buf = await generateXRFProposal(data, jobInfo, 0.0888, {
    certificationNumber: "LBP-F322298-1",
  });
  fs.writeFileSync("sample-preview.pdf", buf);
  console.log("Generated sample-preview.pdf");
}

main();
