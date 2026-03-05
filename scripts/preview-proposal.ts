import { generateXRFProposal, generateDustSwabsProposal, generateAsbestosProposal } from "../src/lib/proposals/generate";
import fs from "fs";

async function main() {
  const jobInfo = {
    job_number: 500,
    client_company: "Interia Management LLC",
  };

  const biz = { certificationNumber: "LBP-F322298-1" };
  const taxRate = 0.0888;

  const xrfData = {
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

  const dustData = {
    ...xrfData,
    has_xrf: false, has_dust_swab: true,
    num_wipes: 30, wipe_rate: 25,
    dust_swab_site_visit_rate: 350, dust_swab_proj_mgmt_rate: 200,
  };

  const asbestosData = {
    ...xrfData,
    has_xrf: false, has_asbestos: true,
    num_asbestos_samples: 15, asbestos_sample_rate: 35, asbestos_site_visit_rate: 400,
  };

  const xrf = await generateXRFProposal(xrfData, jobInfo, taxRate, biz);
  fs.writeFileSync("sample-proposal-xrf.pdf", xrf);
  console.log("Generated sample-proposal-xrf.pdf");

  const dust = await generateDustSwabsProposal(dustData, jobInfo, taxRate, biz);
  fs.writeFileSync("sample-proposal-dust-swabs.pdf", dust);
  console.log("Generated sample-proposal-dust-swabs.pdf");

  const asbestos = await generateAsbestosProposal(asbestosData, jobInfo, taxRate, biz);
  fs.writeFileSync("sample-proposal-asbestos.pdf", asbestos);
  console.log("Generated sample-proposal-asbestos.pdf");
}

main();
