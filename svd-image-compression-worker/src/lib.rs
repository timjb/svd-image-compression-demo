mod utils;

use js_sys::Float64Array;
use nalgebra::base::*;
use nalgebra::linalg::SVD;
use rand::distributions::Uniform;
use rand::rngs::SmallRng;
use rand::SeedableRng;
use std::cmp::*;
use std::vec::Vec;
use wasm_bindgen::prelude::*;
use web_sys::console;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

fn mat_to_float_64_array<C: Dim>(
    mat: &Matrix<f64, Dynamic, C, VecStorage<f64, Dynamic, C>>,
) -> Float64Array {
    unsafe {
        return Float64Array::view(&mat.data.as_vec());
    }
}

#[wasm_bindgen]
pub struct SvdResult {
    u_multiplied_with_singular_values: DMatrix<f64>,
    singular_values: DVector<f64>,
    v_t: DMatrix<f64>,
    current_rank: usize,
    low_rank_approximation: DMatrix<f64>,
}

#[wasm_bindgen]
impl SvdResult {
    fn new(u: DMatrix<f64>, singular_values: DVector<f64>, v_t: DMatrix<f64>) -> SvdResult {
        let low_rank_approximation = DMatrix::zeros(u.nrows(), v_t.ncols());
        let mut u_multiplied_with_singular_values = u;
        for i in 0..singular_values.len() {
            let val = singular_values[i];
            u_multiplied_with_singular_values
                .column_mut(i)
                .scale_mut(val);
        }
        SvdResult {
            u_multiplied_with_singular_values: u_multiplied_with_singular_values,
            singular_values: singular_values,
            v_t: v_t,
            current_rank: 0,
            low_rank_approximation: low_rank_approximation,
        }
    }
    pub fn singular_values(&self) -> Float64Array {
        return mat_to_float_64_array(&self.singular_values);
    }
    fn compute_low_rank_approximation_from_scratch(&mut self) {
        let rank = self.current_rank;
        let timing_label = format!("computation of low rank approximation (rank = {})", rank);
        console::time_with_label(&timing_label);
        let lhs = self.u_multiplied_with_singular_values.columns(0, rank);
        let rhs = self.v_t.rows(0, rank);
        lhs.mul_to(&rhs, &mut self.low_rank_approximation);
        console::time_end_with_label(&timing_label);
    }
    fn update_low_rank_approximation(&mut self, new_rank: usize) {
        let old_rank = self.current_rank;
        let timing_label = format!(
            "update of low rank approximation (old rank = {}, new rank = {})",
            old_rank, new_rank
        );
        console::time_with_label(&timing_label);
        let min_rank = min(old_rank, new_rank);
        let max_rank = max(old_rank, new_rank);
        let lhs = self
            .u_multiplied_with_singular_values
            .columns(min_rank, max_rank - min_rank);
        let rhs = self.v_t.rows(min_rank, max_rank - min_rank);
        let delta = lhs * rhs;
        if new_rank > old_rank {
            self.low_rank_approximation += delta;
        } else {
            self.low_rank_approximation -= delta;
        }
        console::time_end_with_label(&timing_label);
        self.current_rank = new_rank;
    }
    pub fn compute_low_rank_approximation(&mut self, req_rank: usize) -> Float64Array {
        let rank = min(req_rank, self.u_multiplied_with_singular_values.ncols());
        let old_rank = self.current_rank;
        if old_rank < 100 || rank < 100 || 2 * rank < old_rank {
            self.current_rank = rank;
            self.compute_low_rank_approximation_from_scratch();
        } else {
            self.update_low_rank_approximation(rank);
        }
        return mat_to_float_64_array(&self.low_rank_approximation);
    }
}

fn permute_columns<T>(mat: &mut DMatrix<f64>, inv_perm: &Vec<(T, usize)>) {
    assert!(mat.ncols() == inv_perm.len());
    let n = mat.ncols();
    let mut already_permuted = vec![false; n];
    for i in 0..n {
        if !already_permuted[i] {
            let (mut j, mut k) = (i, inv_perm[i].1);
            while k != i {
                mat.swap_columns(j, k);
                already_permuted[k] = true;
                j = k;
                k = inv_perm[k].1;
            }
            already_permuted[i] = true;
        }
    }
}

fn permute_rows<T>(mat: &mut DMatrix<f64>, inv_perm: &Vec<(T, usize)>) {
    assert!(mat.nrows() == inv_perm.len());
    let n = mat.nrows();
    let mut already_permuted = vec![false; n];
    for i in 0..n {
        if !already_permuted[i] {
            let (mut j, mut k) = (i, inv_perm[i].1);
            while k != i {
                mat.swap_rows(j, k);
                already_permuted[k] = true;
                j = k;
                k = inv_perm[k].1;
            }
            already_permuted[i] = true;
        }
    }
}

// We have to sort SVD because this is not done by default,
// see https://github.com/dimforge/nalgebra/issues/349
// TODO(TBa): Is this still necessary? The issue linked above is open, but the following changelog entry
// mentions that the SVs are now sorted:
// https://github.com/dimforge/nalgebra/blob/dev/CHANGELOG.md#0300-02-jan-2022
fn sort_svd(svd: &mut SVD<f64, Dynamic, Dynamic>) {
    let mut s: Vec<(_, _)> = svd
        .singular_values
        .into_iter()
        .enumerate()
        .map(|(idx, &v)| (v, idx))
        .collect();
    s.sort_unstable_by(|a, b| b.partial_cmp(a).unwrap());
    match svd.u.iter_mut().next() {
        Some(u) => permute_columns(u, &s),
        None => {}
    }
    match svd.v_t.iter_mut().next() {
        Some(v_t) => permute_rows(v_t, &s),
        None => {}
    }
    svd.singular_values = DVector::from_vec(s.into_iter().map(|(v, _idx)| v).collect());
}

fn sorted_svd(mat: DMatrix<f64>) -> SVD<f64, Dynamic, Dynamic> {
    let mut svd = mat.svd(true, true);
    sort_svd(&mut svd);
    return svd;
}

#[wasm_bindgen]
pub fn svd(a_data: &[f64], nrows: usize, ncols: usize) -> SvdResult {
    let a = DMatrix::from_column_slice(nrows, ncols, a_data);
    console::time_with_label("computation of SVD");
    let svd = sorted_svd(a);
    console::time_end_with_label("computation of SVD");
    return SvdResult::new(svd.u.unwrap(), svd.singular_values, svd.v_t.unwrap());
}

// Randomized algorithm that calculates the truncated SVD
// technique based on https://research.fb.com/fast-randomized-svd/
// Precondition: t <= MIN(nrows, ncols)
#[wasm_bindgen]
pub fn svd_simple_approx(a_data: &[f64], nrows: usize, ncols: usize, t: usize) -> SvdResult {
    let a = DMatrix::from_column_slice(nrows, ncols, a_data);

    console::time_with_label("computation of approximate SVD");

    // Generate matrix Ω ∈ ℝ^{m × n}
    let mut rng = SmallRng::seed_from_u64(2342);
    let distr: Uniform<f64> = Uniform::new(-1.0, 1.0);
    let omega: DMatrix<f64> = DMatrix::from_distribution(ncols, t, &distr, &mut rng);

    // Compute Y = A Ω
    let y = (&a) * omega;

    // Compute the QR decomposition of Y, Y = Q R
    let q = y.qr().q();

    // Compute B = Qᵀ A
    let b = q.tr_mul(&a);

    // Compute the SVD of B
    let b_svd = sorted_svd(b);

    let u = q * b_svd.u.unwrap();

    console::time_end_with_label("computation of approximate SVD");

    return SvdResult::new(u, b_svd.singular_values, b_svd.v_t.unwrap());
}
