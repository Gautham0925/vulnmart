LAB_FLAGS = {
    "LAB-01": "FLAG{U$@RNAM€_€NUM€RATION_001}",
    "LAB-02": "FLAG{PA$$WORD_R€$€T_€NUM_002}",
    "LAB-03": "FLAG{IDOR_ORD€R_ACC€$$_003}",
    "LAB-04": "FLAG{BROK€N_AUTH_004}",
    "LAB-05": "FLAG{V€RTICAL_PRIV_€$C_005}",
    "LAB-06": "FLAG{HORIZONTAL_PRIV_€$C_006}",
    "LAB-07": "FLAG{R€FL€CT€D_X$$_007}",
    "LAB-08": "FLAG{$TOR€D_X$$_008}",
    "LAB-09": "FLAG{DOM_BA$€D_X$$_009}",
    "LAB-10": "FLAG{$QL_INJ€CTION_010}",
    "LAB-11": "FLAG{JWT_K€Y_CONFU$ION_011}",
    "LAB-12": "FLAG{HALF_AUTH_BYPASS_012}",
}


def flag_for(lab_id: str) -> str:
    return LAB_FLAGS[lab_id]
