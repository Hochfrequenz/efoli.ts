export enum EdifactFormat {
  APERAK = "APERAK",
  COMDIS = "COMDIS",
  CONTRL = "CONTRL",
  IFTSTA = "IFTSTA",
  INSRPT = "INSRPT",
  INVOIC = "INVOIC",
  MSCONS = "MSCONS",
  ORDCHG = "ORDCHG",
  ORDERS = "ORDERS",
  ORDRSP = "ORDRSP",
  PARTIN = "PARTIN",
  PRICAT = "PRICAT",
  QUOTES = "QUOTES",
  REMADV = "REMADV",
  REQOTE = "REQOTE",
  UTILMD = "UTILMD",
  UTILMDG = "UTILMDG", // utilities master data for Gas (since FV2310)
  UTILMDS = "UTILMDS", // utilities master data for Strom (since FV2310)
  UTILMDW = "UTILMDW",
  UTILTS = "UTILTS",
}

const PRUEFI_REGEX = /^[1-9]\d{4}$/;

const edifactMapping: Record<string, EdifactFormat> = {
  "11": EdifactFormat.UTILMD,
  "13": EdifactFormat.MSCONS,
  "15": EdifactFormat.QUOTES,
  "17": EdifactFormat.ORDERS,
  "19": EdifactFormat.ORDRSP,
  "21": EdifactFormat.IFTSTA,
  "23": EdifactFormat.INSRPT,
  "25": EdifactFormat.UTILTS,
  "27": EdifactFormat.PRICAT,
  "29": EdifactFormat.COMDIS,
  "31": EdifactFormat.INVOIC,
  "33": EdifactFormat.REMADV,
  "35": EdifactFormat.REQOTE,
  "37": EdifactFormat.PARTIN,
  "39": EdifactFormat.ORDCHG,
  "44": EdifactFormat.UTILMDG,
  "55": EdifactFormat.UTILMDS,
  "91": EdifactFormat.CONTRL,
  "92": EdifactFormat.APERAK,
  "99": EdifactFormat.APERAK,
};

export function getFormatOfPruefidentifikator(pruefidentifikator: string): EdifactFormat {
  if (!pruefidentifikator) {
    throw new Error("The pruefidentifikator must not be falsy");
  }
  if (!PRUEFI_REGEX.test(pruefidentifikator)) {
    throw new Error(`The pruefidentifikator '${pruefidentifikator}' is invalid.`);
  }
  const prefix = pruefidentifikator.slice(0, 2);
  const format = edifactMapping[prefix];
  if (format === undefined) {
    throw new Error(
      `No Edifact format was found for pruefidentifikator '${pruefidentifikator}'.`
    );
  }
  return format;
}
